from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.mutual_fund_transaction import MutualFundTransaction


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

        for row in rows:
            transaction_date = date.fromisoformat(row["transaction_date"])
            quantity = Decimal(str(row["quantity"]))
            trade_value = Decimal(str(row["trade_value"]))

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
                existing.fund_name = row["fund_name"]
                existing.amc = row["amc"]
                existing.assetclass = row.get("assetclass")
                existing.symbol = row.get("symbol")
                existing.name = row.get("name")
                existing.nav = Decimal(str(row["nav"]))
                existing.source_filename = source_filename
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
