from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.mutual_fund_transaction import MutualFundTransaction

QUANTITY_QUANTIZER = Decimal("0.001")
TRADE_VALUE_QUANTIZER = Decimal("0.01")


def _normalize_quantity(value) -> Decimal:
    return Decimal(str(value)).quantize(QUANTITY_QUANTIZER)


def _normalize_trade_value(value) -> Decimal:
    return Decimal(str(value)).quantize(TRADE_VALUE_QUANTIZER)


def _transaction_key(
    client_pan: str,
    folio: str,
    isin: str,
    transaction_date: date,
    trade_type: str,
    quantity: Decimal,
    trade_value: Decimal,
) -> tuple[str, str, str, date, str, Decimal, Decimal]:
    return (
        client_pan.upper(),
        folio,
        isin,
        transaction_date,
        trade_type,
        _normalize_quantity(quantity),
        _normalize_trade_value(trade_value),
    )


class MutualFundTransactionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_existing(
        self,
        client_pan: str,
        folio: str,
        isin: str,
        transaction_date: date,
        trade_type: str,
        quantity: Decimal,
        trade_value: Decimal,
    ) -> Optional[MutualFundTransaction]:
        return (
            self.db.query(MutualFundTransaction)
            .filter(
                MutualFundTransaction.client_pan == client_pan.upper(),
                MutualFundTransaction.folio == folio,
                MutualFundTransaction.isin == isin,
                MutualFundTransaction.transaction_date == transaction_date,
                MutualFundTransaction.trade_type == trade_type,
                MutualFundTransaction.quantity == quantity,
                MutualFundTransaction.trade_value == trade_value,
            )
            .first()
        )

    def _apply_row(
        self,
        record: MutualFundTransaction,
        row: dict,
        source_filename: str,
        quantity: Decimal,
        trade_value: Decimal,
    ) -> None:
        record.fund_name = row["fund_name"]
        record.amc = row["amc"]
        record.assetclass = row.get("assetclass")
        record.symbol = row.get("symbol")
        record.name = row.get("name")
        record.nav = Decimal(str(row["nav"]))
        record.quantity = quantity
        record.trade_value = trade_value
        record.source_filename = source_filename

    def upsert_many(
        self,
        client_pan: str,
        source_filename: str,
        rows: list[dict],
    ) -> tuple[list[MutualFundTransaction], int, int]:
        client_pan = client_pan.upper()
        saved: list[MutualFundTransaction] = []
        created_count = 0
        updated_count = 0
        records_by_key: dict[
            tuple[str, str, str, date, str, Decimal, Decimal],
            MutualFundTransaction,
        ] = {}

        for row in rows:
            transaction_date = date.fromisoformat(row["transaction_date"])
            quantity = _normalize_quantity(row["quantity"])
            trade_value = _normalize_trade_value(row["trade_value"])
            key = _transaction_key(
                client_pan,
                row["folio"],
                row["isin"],
                transaction_date,
                row["trade_type"],
                quantity,
                trade_value,
            )

            pending = records_by_key.get(key)
            if pending is not None:
                self._apply_row(pending, row, source_filename, quantity, trade_value)
                updated_count += 1
                continue

            existing = self.find_existing(
                client_pan=client_pan,
                folio=row["folio"],
                isin=row["isin"],
                transaction_date=transaction_date,
                trade_type=row["trade_type"],
                quantity=quantity,
                trade_value=trade_value,
            )

            if existing is not None:
                self._apply_row(existing, row, source_filename, quantity, trade_value)
                records_by_key[key] = existing
                saved.append(existing)
                updated_count += 1
                continue

            record = MutualFundTransaction(
                client_pan=client_pan,
                folio=row["folio"],
                fund_name=row["fund_name"],
                amc=row["amc"],
                assetclass=row.get("assetclass"),
                symbol=row.get("symbol"),
                name=row.get("name"),
                isin=row["isin"],
                transaction_date=transaction_date,
                trade_type=row["trade_type"],
                nav=Decimal(str(row["nav"])),
                quantity=quantity,
                trade_value=trade_value,
                source_filename=source_filename,
            )
            self.db.add(record)
            records_by_key[key] = record
            saved.append(record)
            created_count += 1

        self.db.commit()

        for record in saved:
            self.db.refresh(record)

        return saved, created_count, updated_count

    def list_by_client_pan_chronological(self, client_pan: str) -> list[MutualFundTransaction]:
        return (
            self.db.query(MutualFundTransaction)
            .filter(MutualFundTransaction.client_pan == client_pan.upper())
            .order_by(
                MutualFundTransaction.transaction_date.asc(),
                MutualFundTransaction.id.asc(),
            )
            .all()
        )

    def list_by_client_pan(self, client_pan: str) -> list[MutualFundTransaction]:
        return (
            self.db.query(MutualFundTransaction)
            .filter(MutualFundTransaction.client_pan == client_pan.upper())
            .order_by(
                MutualFundTransaction.transaction_date.desc(),
                MutualFundTransaction.id.desc(),
            )
            .all()
        )
