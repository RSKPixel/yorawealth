from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.stock import Stock


class StockRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_existing(
        self,
        client_pan: str,
        symbol: str,
    ) -> Optional[Stock]:
        return (
            self.db.query(Stock)
            .filter(
                Stock.client_pan == client_pan.upper(),
                Stock.symbol == symbol.upper(),
            )
            .first()
        )

    def sync_holdings(
        self,
        client_pan: str,
        holdings: list[dict],
    ) -> list[Stock]:
        client_pan = client_pan.upper()
        active_symbols = {row["symbol"].upper() for row in holdings}
        saved: list[Stock] = []

        existing_records = (
            self.db.query(Stock).filter(Stock.client_pan == client_pan).all()
        )
        for record in existing_records:
            if record.symbol not in active_symbols:
                self.db.delete(record)

        for row in holdings:
            record = self.find_existing(client_pan, row["symbol"])
            if record is None:
                record = Stock(client_pan=client_pan)
                self.db.add(record)

            record.symbol = row["symbol"]
            record.isin = row["isin"]
            record.quantity = Decimal(str(row["quantity"]))
            record.invested_amount = Decimal(str(row["invested_amount"]))
            record.avg_cost = Decimal(str(row["avg_cost"]))
            record.current_price = Decimal(str(row["current_price"]))
            record.current_value = Decimal(str(row["current_value"]))
            record.unrealized_gain = Decimal(str(row["unrealized_gain"]))
            saved.append(record)

        self.db.commit()

        for record in saved:
            self.db.refresh(record)

        return saved

    def list_by_client_pan(self, client_pan: str) -> list[Stock]:
        return (
            self.db.query(Stock)
            .filter(Stock.client_pan == client_pan.upper())
            .order_by(
                Stock.current_value.desc(),
                Stock.symbol.asc(),
            )
            .all()
        )
