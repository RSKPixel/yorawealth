from __future__ import annotations

import re
from collections import defaultdict
from datetime import date
from decimal import Decimal
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.mutual_fund_transaction import MutualFundTransaction
from app.models.portfolio_holding import PortfolioHolding
from app.repositories.mutual_fund_transaction_repository import (
    MutualFundTransactionRepository,
)
from app.repositories.portfolio_holding_repository import PortfolioHoldingRepository
from app.schemas.mutual_fund import (
    PortfolioReconciliationResponse,
    ReconciliationRow,
    ReconciliationSummary,
)
from app.services.cams_extractor import extract_cams_closing_balances

QTY_TOLERANCE = Decimal("0.01")
INVESTED_TOLERANCE = 50.0


class PortfolioReconciliationService:
    def __init__(
        self,
        db: Session,
        cams_upload_dir: Path,
    ) -> None:
        self.db = db
        self.cams_upload_dir = cams_upload_dir
        self.holding_repository = PortfolioHoldingRepository(db)
        self.transaction_repository = MutualFundTransactionRepository(db)

    def reconcile(
        self,
        client_pan: str,
        user_id: int,
    ) -> PortfolioReconciliationResponse:
        client_pan = client_pan.upper()
        holdings = self.holding_repository.list_by_client_pan(client_pan)
        transactions = self.transaction_repository.list_by_client_pan_chronological(
            client_pan
        )
        cams_balances = self._load_cams_closing_balances(user_id, client_pan)
        txn_net_units = self._net_units_by_holding(transactions)

        rows: list[ReconciliationRow] = []
        matched_count = 0
        latest_statement_date: date | None = None

        for holding in holdings:
            key = (holding.folio, holding.isin)
            cams = cams_balances.get(key)
            computed_qty = float(holding.quantity)
            computed_invested = float(holding.invested_amount)
            txn_qty = float(txn_net_units.get(key, Decimal("0")))

            cams_units = cams["closing_units"] if cams else None
            cams_cost = cams["total_cost_value"] if cams else None
            cams_market = cams["market_value"] if cams else None
            statement_nav_date = cams["statement_nav_date"] if cams else None
            source_filename = cams["source_filename"] if cams else None

            if statement_nav_date:
                nav_date = date.fromisoformat(statement_nav_date)
                if latest_statement_date is None or nav_date > latest_statement_date:
                    latest_statement_date = nav_date

            units_diff = (
                round(computed_qty - cams_units, 3) if cams_units is not None else None
            )
            invested_diff = (
                round(computed_invested - cams_cost, 2)
                if cams_cost is not None
                else None
            )
            txn_qty_diff = round(computed_qty - txn_qty, 3)

            units_ok = (
                cams_units is not None
                and abs(units_diff or 0) <= float(QTY_TOLERANCE)
            )
            invested_ok = (
                cams_cost is not None
                and abs(invested_diff or 0) <= INVESTED_TOLERANCE
            )
            txn_ok = abs(txn_qty_diff) <= float(QTY_TOLERANCE)
            cams_present = cams_units is not None

            if cams_present and units_ok and invested_ok and txn_ok:
                status = "matched"
                matched_count += 1
            elif not cams_present:
                status = "missing_cams"
            elif not units_ok or not txn_ok:
                status = "units_mismatch"
            elif not invested_ok:
                status = "invested_mismatch"
            else:
                status = "partial"

            rows.append(
                ReconciliationRow(
                    folio=holding.folio,
                    isin=holding.isin,
                    fund_name=holding.fund_name,
                    computed_quantity=computed_qty,
                    txn_net_quantity=txn_qty,
                    cams_closing_units=cams_units,
                    quantity_diff=units_diff,
                    txn_quantity_diff=txn_qty_diff,
                    computed_invested=computed_invested,
                    cams_total_cost=cams_cost,
                    invested_diff=invested_diff,
                    cams_market_value=cams_market,
                    statement_nav_date=statement_nav_date,
                    source_filename=source_filename,
                    status=status,
                )
            )

        total = len(rows)
        if total == 0:
            overall_status = "empty"
        elif matched_count == total:
            overall_status = "matched"
        elif matched_count > 0:
            overall_status = "partial"
        else:
            overall_status = "mismatch"

        return PortfolioReconciliationResponse(
            summary=ReconciliationSummary(
                status=overall_status,
                matched_count=matched_count,
                total_count=total,
                statement_date=(
                    latest_statement_date.isoformat()
                    if latest_statement_date
                    else None
                ),
                quantity_tolerance=float(QTY_TOLERANCE),
                invested_tolerance=INVESTED_TOLERANCE,
            ),
            rows=rows,
        )

    def _load_cams_closing_balances(
        self,
        user_id: int,
        client_pan: str,
    ) -> dict[tuple[str, str], dict]:
        user_dir = self.cams_upload_dir / str(user_id)
        if not user_dir.is_dir():
            return {}

        latest_by_statement: dict[str, Path] = {}
        for pdf_path in user_dir.glob("*.pdf"):
            statement_key = self._statement_key(pdf_path)
            existing = latest_by_statement.get(statement_key)
            if existing is None or pdf_path.stat().st_mtime > existing.stat().st_mtime:
                latest_by_statement[statement_key] = pdf_path

        merged: dict[tuple[str, str], dict] = {}

        for pdf_path in latest_by_statement.values():
            try:
                closings = extract_cams_closing_balances(
                    pdf_path,
                    client_pan=client_pan,
                )
            except Exception:
                continue

            for closing in closings:
                key = (closing["folio"], closing["isin"])
                existing = merged.get(key)
                if existing is None:
                    merged[key] = closing
                    continue

                existing_date = date.fromisoformat(existing["statement_nav_date"])
                new_date = date.fromisoformat(closing["statement_nav_date"])
                if new_date >= existing_date:
                    merged[key] = closing

        return merged

    @staticmethod
    def _statement_key(pdf_path: Path) -> str:
        match = re.search(r"(CP\d+)", pdf_path.name, flags=re.IGNORECASE)
        return match.group(1).upper() if match else pdf_path.name

    @staticmethod
    def _net_units_by_holding(
        transactions: list[MutualFundTransaction],
    ) -> dict[tuple[str, str], Decimal]:
        totals: dict[tuple[str, str], Decimal] = defaultdict(lambda: Decimal("0"))
        for transaction in transactions:
            key = (transaction.folio, transaction.isin)
            units = abs(Decimal(str(transaction.quantity)))
            if transaction.trade_type == "IN":
                totals[key] += units
            else:
                totals[key] -= units
        return totals
