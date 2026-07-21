from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import logging

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories.mutual_fund_transaction_repository import (
    MutualFundTransactionRepository,
)
from app.repositories.portfolio_holding_repository import PortfolioHoldingRepository
from app.schemas.mutual_fund import (
    CamsTransactionRow,
    CamsUploadResponse,
    PortfolioHoldingsResponse,
    PortfolioReconciliationResponse,
)
from app.services.cams_extractor import extract_cams_pdf
from app.services.mutual_fund_mapper import transaction_to_row
from app.services.portfolio_holdings_service import PortfolioHoldingsService
from app.services.portfolio_reconciliation_service import PortfolioReconciliationService
from app.services.portfolio_returns_service import PortfolioReturnsService

logger = logging.getLogger(__name__)

ALLOWED_PDF_TYPES = {
    "application/pdf": ".pdf",
    "application/x-pdf": ".pdf",
}


class MutualFundService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.transaction_repository = MutualFundTransactionRepository(db)
        self.holding_repository = PortfolioHoldingRepository(db)
        self.holdings_service = PortfolioHoldingsService(
            self.transaction_repository,
            self.holding_repository,
        )
        self.returns_service = PortfolioReturnsService()
        upload_root = Path(settings.upload_dir)
        if not upload_root.is_absolute():
            # Resolve relative to backend package root (/.../backend/uploads)
            upload_root = Path(__file__).resolve().parents[2] / upload_root
        self.cams_upload_dir = upload_root / "cams"
        self.cams_upload_dir.mkdir(parents=True, exist_ok=True)

    def list_transactions(self, client_pan: str) -> list[CamsTransactionRow]:
        records = self.transaction_repository.list_by_client_pan(client_pan)
        return [transaction_to_row(record) for record in records]

    def reconcile_portfolio(
        self,
        client_pan: str,
        user_id: int,
    ) -> PortfolioReconciliationResponse:
        service = PortfolioReconciliationService(self.db, self.cams_upload_dir)
        return service.reconcile(client_pan, user_id)

    def list_holdings(self, client_pan: str) -> PortfolioHoldingsResponse:
        records = self.holding_repository.list_by_client_pan(client_pan)
        transactions = self.transaction_repository.list_by_client_pan_chronological(
            client_pan
        )
        if not records and transactions:
            self.refresh_holdings(client_pan)
            records = self.holding_repository.list_by_client_pan(client_pan)

        holdings = self.returns_service.enrich_holdings(records, transactions)
        total_invested = sum(row.invested_amount for row in holdings)
        total_current_value = sum(row.current_value for row in holdings)
        total_unrealized_gain = sum(row.unrealized_gain for row in holdings)
        portfolio_xirr, portfolio_cagr = self.returns_service.calculate_portfolio_metrics(
            holdings,
            transactions,
        )
        return PortfolioHoldingsResponse(
            holdings=holdings,
            total_invested=round(total_invested, 2),
            total_current_value=round(total_current_value, 2),
            total_unrealized_gain=round(total_unrealized_gain, 2),
            xirr=portfolio_xirr,
            cagr=portfolio_cagr,
        )

    def refresh_holdings(self, client_pan: str) -> None:
        self.holdings_service.recalculate_for_client(client_pan)

    async def upload_cams_pdf(
        self,
        user_id: int,
        file: UploadFile,
        client_pan: Optional[str] = None,
    ) -> CamsUploadResponse:
        if not client_pan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client PAN is required to store transactions.",
            )

        content_type = (file.content_type or "").split(";")[0].strip().lower()
        filename_hint = (file.filename or "").lower()
        extension = ALLOWED_PDF_TYPES.get(content_type)
        if extension is None and filename_hint.endswith(".pdf"):
            extension = ".pdf"
        if extension is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please select a PDF file.",
            )

        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected file is empty.",
            )

        if len(contents) > settings.cams_pdf_max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF must be 10 MB or smaller.",
            )

        try:
            user_dir = self.cams_upload_dir / str(user_id)
            user_dir.mkdir(parents=True, exist_ok=True)

            timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
            original_name = Path(file.filename or "statement.pdf").stem
            safe_name = "".join(
                char if char.isalnum() or char in {"-", "_"} else "-"
                for char in original_name
            ).strip("-_") or "statement"
            filename = f"{timestamp}-{safe_name}{extension}"
            destination = user_dir / filename
            destination.write_bytes(contents)
        except OSError as error:
            logger.exception("Failed to store CAMS upload for user %s", user_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unable to store uploaded PDF on server: {error}",
            ) from error

        try:
            rows = extract_cams_pdf(destination, client_pan=client_pan)
        except Exception as error:
            destination.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to read CAMS PDF: {error}",
            ) from error

        if not rows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No transactions found in the CAMS PDF.",
            )

        try:
            _, created_count, updated_count = self.transaction_repository.upsert_many(
                client_pan=client_pan,
                source_filename=filename,
                rows=rows,
            )
            self.refresh_holdings(client_pan)
        except Exception as error:
            logger.exception(
                "Failed to persist CAMS upload for pan=%s file=%s",
                client_pan,
                filename,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unable to save CAMS transactions: {error}",
            ) from error

        parts = []
        if created_count:
            parts.append(
                f"{created_count} new transaction{'s' if created_count != 1 else ''}"
            )
        if updated_count:
            parts.append(
                f"{updated_count} existing transaction{'s' if updated_count != 1 else ''} updated"
            )
        parts.append("portfolio holdings refreshed")
        detail = f"CAMS statement processed. {', '.join(parts)}."

        # Frontend reloads transactions after upload; skip serializing the full set.
        return CamsUploadResponse(
            filename=filename,
            detail=detail,
            transactions=[],
        )
