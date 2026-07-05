from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.stock_transaction import StockTransaction
from app.repositories.nse_eod_repository import NseEodRepository
from app.repositories.stock_repository import StockRepository
from app.repositories.stock_transaction_repository import StockTransactionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.stocks import (
    ManualTradeCreate,
    ManualTradeResponse,
    StockHoldingsResponse,
    StockTransactionsResponse,
    TradebookUploadResponse,
)
from app.services.stock_holdings_service import StockHoldingsService
from app.services.stock_mapper import transaction_to_row
from app.services.stock_returns_service import (
    StockReturnsService,
    resolve_stock_valuation_date,
)
from app.services.tradebook_templates import (
    ZERODHA_TRADEBOOK_CSV_TEMPLATE_ID,
    validate_zerodha_tradebook_csv,
)
from app.services.manual_trade import (
    MANUAL_TRADE_SOURCE,
    build_manual_trade_row,
    is_manual_transaction,
)
from app.services.stock_brokers import (
    is_supported_broker,
    resolve_tradebook_template,
)
from app.services.stock_trade_types import NON_CASH_TRADE_TYPES
from app.services.zerodha_tradebook_parser import parse_zerodha_tradebook_csv

ALLOWED_TRADEBOOK_TEMPLATES = {ZERODHA_TRADEBOOK_CSV_TEMPLATE_ID}
MAX_TRADEBOOK_BYTES = 10 * 1024 * 1024


class StocksService:
    def __init__(self, db: Session, tradebook_upload_dir: Path) -> None:
        self.db = db
        self.user_repository = UserRepository(db)
        self.transaction_repository = StockTransactionRepository(db)
        self.stock_repository = StockRepository(db)
        self.nse_eod_repository = NseEodRepository(db)
        self.holdings_service = StockHoldingsService(
            self.transaction_repository,
            self.stock_repository,
            self.nse_eod_repository,
        )
        self.returns_service = StockReturnsService()
        self.tradebook_upload_dir = tradebook_upload_dir

    def list_transactions(self, client_pan: str) -> StockTransactionsResponse:
        records = self.transaction_repository.list_by_client_pan(client_pan)
        return StockTransactionsResponse(
            transactions=[transaction_to_row(record) for record in records],
        )

    def list_holdings(self, client_pan: str) -> StockHoldingsResponse:
        records = self.stock_repository.list_by_client_pan(client_pan)
        transactions = self.transaction_repository.list_by_client_pan_chronological(
            client_pan
        )
        if not records and transactions:
            self.refresh_holdings(client_pan)
            records = self.stock_repository.list_by_client_pan(client_pan)

        eod_map = self.nse_eod_repository.map_by_symbols(
            [record.symbol for record in records]
        )
        valuation_date = (
            resolve_stock_valuation_date(eod_map) if eod_map else None
        )

        holdings = self.returns_service.enrich_holdings(
            records=records,
            transactions=transactions,
            eod_map=eod_map,
            valuation_date=valuation_date,
        )
        total_invested = sum(row.invested_amount for row in holdings)
        total_current_value = sum(row.current_value for row in holdings)
        total_unrealized_gain = sum(row.unrealized_gain for row in holdings)
        portfolio_xirr = self.returns_service.calculate_portfolio_xirr(
            holdings=holdings,
            transactions=transactions,
            valuation_date=valuation_date,
        )

        return StockHoldingsResponse(
            holdings=holdings,
            total_invested=round(total_invested, 2),
            total_current_value=round(total_current_value, 2),
            total_unrealized_gain=round(total_unrealized_gain, 2),
            xirr=portfolio_xirr,
        )

    def refresh_holdings(self, client_pan: str) -> None:
        self.holdings_service.recalculate_for_client(client_pan)

    def _get_user_client_pan(self, user_id: int) -> str:
        user = self.user_repository.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if not user.client_pan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client PAN is required to store stock transactions.",
            )

        return user.client_pan

    def _validate_manual_trade_payload(self, payload: ManualTradeCreate) -> None:
        trade_type = payload.trade_type.value
        if trade_type not in NON_CASH_TRADE_TYPES and payload.rate <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rate must be greater than zero for this trade type.",
            )

    def _get_manual_trade(
        self,
        client_pan: str,
        trade_id: str,
    ) -> StockTransaction:
        record = self.transaction_repository.find_existing(client_pan, trade_id)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manual trade not found.",
            )

        if not is_manual_transaction(record):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only manual trades can be modified.",
            )

        return record

    def create_manual_trade(
        self,
        user_id: int,
        payload: ManualTradeCreate,
    ) -> ManualTradeResponse:
        client_pan = self._get_user_client_pan(user_id)
        self._validate_manual_trade_payload(payload)

        trade_id = f"MAN-{uuid4().hex[:12].upper()}"
        row = build_manual_trade_row(payload, trade_id)

        self.transaction_repository.upsert_many(
            client_pan=client_pan,
            source_filename=MANUAL_TRADE_SOURCE,
            rows=[row],
            broker=payload.broker.value,
        )
        self.refresh_holdings(client_pan)

        return ManualTradeResponse(
            detail="Manual trade added and stock holdings refreshed.",
            trade_id=trade_id,
        )

    def update_manual_trade(
        self,
        user_id: int,
        trade_id: str,
        payload: ManualTradeCreate,
    ) -> ManualTradeResponse:
        client_pan = self._get_user_client_pan(user_id)
        self._validate_manual_trade_payload(payload)
        self._get_manual_trade(client_pan, trade_id)

        row = build_manual_trade_row(payload, trade_id.upper())
        self.transaction_repository.upsert_many(
            client_pan=client_pan,
            source_filename=MANUAL_TRADE_SOURCE,
            rows=[row],
            broker=payload.broker.value,
        )
        self.refresh_holdings(client_pan)

        return ManualTradeResponse(
            detail="Manual trade updated and stock holdings refreshed.",
            trade_id=trade_id.upper(),
        )

    def delete_manual_trade(
        self,
        user_id: int,
        trade_id: str,
    ) -> ManualTradeResponse:
        client_pan = self._get_user_client_pan(user_id)
        self._get_manual_trade(client_pan, trade_id)

        deleted = self.transaction_repository.delete_by_trade_id(
            client_pan,
            trade_id.upper(),
        )
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manual trade not found.",
            )

        self.refresh_holdings(client_pan)

        return ManualTradeResponse(
            detail="Manual trade deleted and stock holdings refreshed.",
            trade_id=trade_id.upper(),
        )

    async def upload_tradebook(
        self,
        user_id: int,
        file: UploadFile,
        broker: str,
    ) -> TradebookUploadResponse:
        if not is_supported_broker(broker):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported broker.",
            )

        try:
            template = resolve_tradebook_template(broker)
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(error),
            ) from error

        if template not in ALLOWED_TRADEBOOK_TEMPLATES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported tradebook template.",
            )

        user = self.user_repository.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if not user.client_pan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client PAN is required to store stock transactions.",
            )

        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected file is empty.",
            )

        if len(contents) > MAX_TRADEBOOK_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be 10 MB or smaller.",
            )

        if template == ZERODHA_TRADEBOOK_CSV_TEMPLATE_ID:
            try:
                validate_zerodha_tradebook_csv(contents)
                rows = parse_zerodha_tradebook_csv(contents)
            except ValueError as error:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(error),
                ) from error
        else:
            rows = []

        user_dir = self.tradebook_upload_dir / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        original_name = Path(file.filename or "tradebook.csv").stem
        safe_name = "".join(
            char if char.isalnum() or char in {"-", "_"} else "-"
            for char in original_name
        ).strip("-_") or "tradebook"
        filename = f"{timestamp}-{safe_name}.csv"
        destination = user_dir / filename
        destination.write_bytes(contents)

        try:
            _, created_count, updated_count = self.transaction_repository.upsert_many(
                client_pan=user.client_pan,
                source_filename=filename,
                rows=rows,
                broker=broker,
            )
            self.refresh_holdings(user.client_pan)
        except Exception as error:
            destination.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to import tradebook: {error}",
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
        parts.append("stock holdings refreshed")
        detail = f"Tradebook processed. {', '.join(parts)}."

        return TradebookUploadResponse(
            filename=filename,
            detail=detail,
        )
