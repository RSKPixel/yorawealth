from __future__ import annotations

from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.mutual_fund_historical_repository import (
    MutualFundHistoricalRepository,
)
from app.repositories.mutual_fund_transaction_repository import (
    MutualFundTransactionRepository,
)
from app.repositories.portfolio_holding_repository import (
    PortfolioHoldingRepository,
    normalize_folio,
)
from app.schemas.mutual_fund import (
    HoldingChartResponse,
    HoldingTransactionMarker,
    NavHistoryPoint,
)
from app.services.amfi_lookup import fetch_amfi_index, lookup_isin
from app.services.amfi_nav_sync_service import AmfiNavSyncService
from app.services.nav_history_constants import MAX_NAV_HISTORY_DAYS


class HoldingChartService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.holding_repository = PortfolioHoldingRepository(db)
        self.transaction_repository = MutualFundTransactionRepository(db)
        self.historical_repository = MutualFundHistoricalRepository(db)
        self.sync_service = AmfiNavSyncService(db)

    def get_chart(
        self,
        client_pan: str,
        folio: str,
        isin: str,
    ) -> HoldingChartResponse:
        holding = self.holding_repository.find_for_chart(
            client_pan,
            folio,
            isin,
        )
        if holding is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Holding not found.",
            )

        target_folio = normalize_folio(folio)
        target_isin = isin.upper().strip()
        transactions = [
            transaction
            for transaction in self.transaction_repository.list_by_client_pan_chronological(
                client_pan
            )
            if normalize_folio(transaction.folio) == target_folio
            and transaction.isin.upper() == target_isin
        ]
        if not transactions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No transactions found for this holding.",
            )

        amfi_info = lookup_isin(isin, fetch_amfi_index())
        if amfi_info is None or not amfi_info.scheme_code:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AMFI scheme not found for this ISIN.",
            )

        first_txn_date = min(transaction.transaction_date for transaction in transactions)
        to_date = date.today()
        from_date = to_date - timedelta(days=MAX_NAV_HISTORY_DAYS)
        chart_from_date = max(first_txn_date - timedelta(days=7), from_date)

        sync_error = self.sync_service.ensure_history(
            isin=isin,
            fund_name=holding.fund_name,
            from_date=from_date,
            to_date=to_date,
        )

        records = self.historical_repository.list_by_scheme_code(
            amfi_info.scheme_code,
            from_date,
            to_date,
        )

        nav_history = [
            NavHistoryPoint(date=record.date.isoformat(), nav=float(record.nav))
            for record in records
        ]

        if not nav_history:
            message = sync_error or "NAV history is not available for this fund."
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=message,
            )

        sync_warning = sync_error

        markers = [
            HoldingTransactionMarker(
                date=transaction.transaction_date.isoformat(),
                nav=float(transaction.nav),
                trade_type=transaction.trade_type,
                quantity=float(transaction.quantity),
                trade_value=float(transaction.trade_value),
            )
            for transaction in transactions
        ]

        return HoldingChartResponse(
            fund_name=holding.fund_name,
            scheme_code=amfi_info.scheme_code,
            from_date=chart_from_date.isoformat(),
            to_date=to_date.isoformat(),
            nav_history=nav_history,
            transactions=markers,
            sync_warning=sync_warning,
        )
