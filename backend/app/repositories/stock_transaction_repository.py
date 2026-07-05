from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.stock_transaction import StockTransaction


class StockTransactionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_existing(
        self,
        client_pan: str,
        trade_id: str,
    ) -> Optional[StockTransaction]:
        return (
            self.db.query(StockTransaction)
            .filter(
                StockTransaction.client_pan == client_pan.upper(),
                StockTransaction.trade_id == trade_id,
            )
            .first()
        )

    def upsert_many(
        self,
        client_pan: str,
        source_filename: str,
        rows: list[dict],
        broker: str,
    ) -> tuple[list[StockTransaction], int, int]:
        client_pan = client_pan.upper()
        saved: list[StockTransaction] = []
        created_count = 0
        updated_count = 0

        for row in rows:
            existing = self.find_existing(client_pan, row["trade_id"])

            if existing is not None:
                existing.symbol = row["symbol"]
                existing.isin = row["isin"]
                existing.exchange = row["exchange"]
                existing.segment = row.get("segment")
                existing.series = row.get("series")
                existing.transaction_date = row["transaction_date"]
                existing.trade_type = row["trade_type"]
                existing.quantity = Decimal(str(row["quantity"]))
                existing.price = Decimal(str(row["price"]))
                existing.trade_value = Decimal(str(row["trade_value"]))
                existing.order_id = row.get("order_id")
                existing.order_execution_time = row.get("order_execution_time")
                existing.source_filename = source_filename
                existing.broker = broker
                saved.append(existing)
                updated_count += 1
                continue

            record = StockTransaction(
                client_pan=client_pan,
                symbol=row["symbol"],
                isin=row["isin"],
                exchange=row["exchange"],
                segment=row.get("segment"),
                series=row.get("series"),
                transaction_date=row["transaction_date"],
                trade_type=row["trade_type"],
                quantity=Decimal(str(row["quantity"])),
                price=Decimal(str(row["price"])),
                trade_value=Decimal(str(row["trade_value"])),
                trade_id=row["trade_id"],
                order_id=row.get("order_id"),
                order_execution_time=row.get("order_execution_time"),
                source_filename=source_filename,
                broker=broker,
            )
            self.db.add(record)
            saved.append(record)
            created_count += 1

        self.db.commit()

        for record in saved:
            self.db.refresh(record)

        return saved, created_count, updated_count

    def delete_by_trade_id(self, client_pan: str, trade_id: str) -> bool:
        record = self.find_existing(client_pan, trade_id)
        if record is None:
            return False

        self.db.delete(record)
        self.db.commit()
        return True

    def list_by_client_pan_chronological(self, client_pan: str) -> list[StockTransaction]:
        return (
            self.db.query(StockTransaction)
            .filter(StockTransaction.client_pan == client_pan.upper())
            .order_by(
                StockTransaction.transaction_date.asc(),
                StockTransaction.id.asc(),
            )
            .all()
        )

    def list_by_client_pan(self, client_pan: str) -> list[StockTransaction]:
        return (
            self.db.query(StockTransaction)
            .filter(StockTransaction.client_pan == client_pan.upper())
            .order_by(
                StockTransaction.transaction_date.desc(),
                StockTransaction.id.desc(),
            )
            .all()
        )
