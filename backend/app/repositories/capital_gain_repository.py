from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.capital_gain import CapitalGain
from app.schemas.capital_gains import RealizedGainRow


class CapitalGainRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_by_id(self, client_pan: str, record_id: int) -> Optional[CapitalGain]:
        return (
            self.db.query(CapitalGain)
            .filter(
                CapitalGain.client_pan == client_pan.upper(),
                CapitalGain.id == record_id,
            )
            .first()
        )

    def find_by_source_key(self, client_pan: str, source_key: str) -> Optional[CapitalGain]:
        return (
            self.db.query(CapitalGain)
            .filter(
                CapitalGain.client_pan == client_pan.upper(),
                CapitalGain.source_key == source_key,
            )
            .first()
        )

    def list_by_client_pan(self, client_pan: str) -> list[CapitalGain]:
        return (
            self.db.query(CapitalGain)
            .filter(CapitalGain.client_pan == client_pan.upper())
            .order_by(
                CapitalGain.transaction_date.desc(),
                CapitalGain.label.asc(),
                CapitalGain.id.desc(),
            )
            .all()
        )

    def list_manual_by_client_pan(self, client_pan: str) -> list[CapitalGain]:
        return (
            self.db.query(CapitalGain)
            .filter(
                CapitalGain.client_pan == client_pan.upper(),
                CapitalGain.is_manual.is_(True),
            )
            .order_by(
                CapitalGain.transaction_date.desc(),
                CapitalGain.label.asc(),
                CapitalGain.id.desc(),
            )
            .all()
        )

    def list_synced_by_client_pan(self, client_pan: str) -> list[CapitalGain]:
        return (
            self.db.query(CapitalGain)
            .filter(
                CapitalGain.client_pan == client_pan.upper(),
                CapitalGain.is_manual.is_(False),
                CapitalGain.source_key.isnot(None),
            )
            .all()
        )

    def create(self, record: CapitalGain) -> CapitalGain:
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def delete(self, record: CapitalGain) -> None:
        self.db.delete(record)
        self.db.commit()

    def commit(self) -> None:
        self.db.commit()

    def refresh(self, record: CapitalGain) -> CapitalGain:
        self.db.refresh(record)
        return record

    @staticmethod
    def apply_computed_row(record: CapitalGain, row: RealizedGainRow) -> None:
        record.asset_type = row.asset_type
        record.transaction_date = date.fromisoformat(row.transaction_date)
        record.label = row.label
        record.folio = row.folio
        record.broker = row.broker
        record.meta = row.meta
        record.quantity = Decimal(str(row.quantity))
        record.sell_rate = Decimal(str(row.sell_rate))
        record.buy_rate = Decimal(str(row.buy_rate))
        record.trade_value = Decimal(str(row.trade_value))
        record.purchase_value = Decimal(str(row.purchase_value))
        record.realized_gain = Decimal(str(row.realized_gain))
        record.short_term_gain = Decimal(str(row.short_term_gain))
        record.long_term_gain = Decimal(str(row.long_term_gain))
        record.short_term_holding_period_days = row.short_term_holding_period_days
        record.long_term_holding_period_days = row.long_term_holding_period_days
        record.short_term_quantity = Decimal(str(row.short_term_quantity))
        record.long_term_quantity = Decimal(str(row.long_term_quantity))
        record.trade_type = row.trade_type
        record.is_manual = False

    def sync_computed_rows(
        self,
        client_pan: str,
        computed_rows: list[RealizedGainRow],
    ) -> list[CapitalGain]:
        client_pan = client_pan.upper()
        active_source_keys: set[str] = set()
        synced_records: list[CapitalGain] = []

        for row in computed_rows:
            source_key = row.id
            active_source_keys.add(source_key)
            existing = self.find_by_source_key(client_pan, source_key)
            if existing is None:
                existing = CapitalGain(
                    client_pan=client_pan,
                    source_key=source_key,
                    is_manual=False,
                    sale_reason=None,
                )
                self.db.add(existing)

            self.apply_computed_row(existing, row)
            synced_records.append(existing)

        stale_records = self.list_synced_by_client_pan(client_pan)
        for record in stale_records:
            if record.source_key not in active_source_keys:
                self.db.delete(record)

        self.db.commit()
        for record in synced_records:
            self.db.refresh(record)

        return synced_records
