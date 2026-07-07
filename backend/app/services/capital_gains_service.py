from __future__ import annotations

import logging
import zlib
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.models.capital_gain import CapitalGain
from app.repositories.capital_gain_repository import CapitalGainRepository
from app.schemas.capital_gains import (
    CapitalGainCreate,
    CapitalGainDeleteResponse,
    CapitalGainResponse,
    CapitalGainRow,
    CapitalGainUpdate,
    RealizedGainRow,
    RealizedGainsResponse,
)
from app.services.realized_gains_service import RealizedGainsService

logger = logging.getLogger(__name__)


def _decimal(value: Decimal | float | int | str) -> Decimal:
    return Decimal(str(value))


def _to_capital_gain_row(record: CapitalGain) -> CapitalGainRow:
    return CapitalGainRow(
        id=record.id,
        source_key=record.source_key,
        is_manual=record.is_manual,
        asset_type=record.asset_type,  # type: ignore[arg-type]
        transaction_date=record.transaction_date.isoformat(),
        label=record.label,
        folio=record.folio,
        broker=record.broker,
        meta=record.meta,
        quantity=float(record.quantity),
        sell_rate=float(record.sell_rate),
        buy_rate=float(record.buy_rate),
        trade_value=float(record.trade_value),
        purchase_value=float(record.purchase_value),
        realized_gain=float(record.realized_gain),
        short_term_gain=float(record.short_term_gain),
        long_term_gain=float(record.long_term_gain),
        short_term_holding_period_days=record.short_term_holding_period_days,
        long_term_holding_period_days=record.long_term_holding_period_days,
        short_term_quantity=float(record.short_term_quantity),
        long_term_quantity=float(record.long_term_quantity),
        trade_type=record.trade_type,
        sale_reason=record.sale_reason,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _computed_row_to_capital_gain_row(row: RealizedGainRow) -> CapitalGainRow:
    now = datetime.now(timezone.utc)
    fallback_id = zlib.crc32(row.id.encode("utf-8")) & 0x7FFFFFFF or 1

    return CapitalGainRow(
        id=fallback_id,
        source_key=row.id,
        is_manual=False,
        asset_type=row.asset_type,
        transaction_date=row.transaction_date,
        label=row.label,
        folio=row.folio,
        broker=row.broker,
        meta=row.meta,
        quantity=row.quantity,
        sell_rate=row.sell_rate,
        buy_rate=row.buy_rate,
        trade_value=row.trade_value,
        purchase_value=row.purchase_value,
        realized_gain=row.realized_gain,
        short_term_gain=row.short_term_gain,
        long_term_gain=row.long_term_gain,
        short_term_holding_period_days=row.short_term_holding_period_days,
        long_term_holding_period_days=row.long_term_holding_period_days,
        short_term_quantity=row.short_term_quantity,
        long_term_quantity=row.long_term_quantity,
        trade_type=row.trade_type,
        sale_reason=None,
        created_at=now,
        updated_at=now,
    )


def _sort_capital_gain_rows(rows: list[CapitalGainRow]) -> list[CapitalGainRow]:
    return sorted(
        rows,
        key=lambda row: (
            row.transaction_date,
            row.label,
            row.folio or "",
            row.broker or "",
            row.id,
        ),
        reverse=True,
    )


class CapitalGainsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.realized_gains_service = RealizedGainsService(db)
        self.capital_gain_repository = CapitalGainRepository(db)

    def list_realized_gains(self, client_pan: str) -> RealizedGainsResponse:
        computed = self.realized_gains_service.compute_realized_gains(client_pan)
        try:
            synced_records = self.capital_gain_repository.sync_computed_rows(
                client_pan,
                computed,
            )
            manual_records = self.capital_gain_repository.list_manual_by_client_pan(client_pan)
            rows = _sort_capital_gain_rows(
                [_to_capital_gain_row(record) for record in synced_records + manual_records]
            )
        except (OperationalError, ProgrammingError) as error:
            logger.warning(
                "capital_gains table unavailable; returning computed rows only: %s",
                error,
            )
            self.db.rollback()
            rows = _sort_capital_gain_rows(
                [_computed_row_to_capital_gain_row(row) for row in computed]
            )

        return RealizedGainsResponse(transactions=rows)

    def get_capital_gain(self, client_pan: str, record_id: int) -> CapitalGainResponse:
        record = self._get_owned_record(client_pan, record_id)
        return CapitalGainResponse(
            transaction=_to_capital_gain_row(record),
            detail="Capital gain record loaded.",
        )

    def create_capital_gain(
        self,
        client_pan: str,
        payload: CapitalGainCreate,
    ) -> CapitalGainResponse:
        record = self._build_manual_record(client_pan, payload)
        created = self.capital_gain_repository.create(record)
        return CapitalGainResponse(
            transaction=_to_capital_gain_row(created),
            detail="Capital gain record created.",
        )

    def update_capital_gain(
        self,
        client_pan: str,
        record_id: int,
        payload: CapitalGainUpdate,
    ) -> CapitalGainResponse:
        record = self._get_owned_record(client_pan, record_id)
        update_data = payload.model_dump(exclude_unset=True)

        if not record.is_manual:
            allowed_fields = {"sale_reason"}
            disallowed = set(update_data) - allowed_fields
            if disallowed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only sale_reason can be updated for computed capital gain records.",
                )

        if record.is_manual:
            self._apply_manual_update(record, update_data)
        elif "sale_reason" in update_data:
            record.sale_reason = update_data["sale_reason"]

        self.capital_gain_repository.commit()
        self.capital_gain_repository.refresh(record)
        return CapitalGainResponse(
            transaction=_to_capital_gain_row(record),
            detail="Capital gain record updated.",
        )

    def delete_capital_gain(self, client_pan: str, record_id: int) -> CapitalGainDeleteResponse:
        record = self._get_owned_record(client_pan, record_id)
        self.capital_gain_repository.delete(record)
        return CapitalGainDeleteResponse(detail="Capital gain record deleted.")

    def _get_owned_record(self, client_pan: str, record_id: int) -> CapitalGain:
        record = self.capital_gain_repository.find_by_id(client_pan, record_id)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Capital gain record not found.",
            )
        return record

    def _build_manual_record(self, client_pan: str, payload: CapitalGainCreate) -> CapitalGain:
        transaction_date = date.fromisoformat(payload.transaction_date)
        trade_value = _decimal(payload.trade_value).quantize(Decimal("0.01"))
        purchase_value = _decimal(payload.purchase_value).quantize(Decimal("0.01"))
        realized_gain = payload.realized_gain
        if realized_gain is None:
            realized_gain = float((trade_value - purchase_value).quantize(Decimal("0.01")))

        return CapitalGain(
            client_pan=client_pan.upper(),
            source_key=None,
            is_manual=True,
            asset_type=payload.asset_type,
            transaction_date=transaction_date,
            label=payload.label.strip(),
            folio=payload.folio,
            broker=payload.broker,
            meta=payload.meta,
            quantity=_decimal(payload.quantity),
            sell_rate=_decimal(payload.sell_rate),
            buy_rate=_decimal(payload.buy_rate),
            trade_value=trade_value,
            purchase_value=purchase_value,
            realized_gain=_decimal(realized_gain).quantize(Decimal("0.01")),
            short_term_gain=_decimal(payload.short_term_gain).quantize(Decimal("0.01")),
            long_term_gain=_decimal(payload.long_term_gain).quantize(Decimal("0.01")),
            short_term_holding_period_days=payload.short_term_holding_period_days,
            long_term_holding_period_days=payload.long_term_holding_period_days,
            short_term_quantity=Decimal("0"),
            long_term_quantity=Decimal("0"),
            trade_type=payload.trade_type,
            sale_reason=payload.sale_reason,
        )

    def _apply_manual_update(self, record: CapitalGain, update_data: dict) -> None:
        if "transaction_date" in update_data and update_data["transaction_date"] is not None:
            record.transaction_date = date.fromisoformat(update_data["transaction_date"])
        if "asset_type" in update_data and update_data["asset_type"] is not None:
            record.asset_type = update_data["asset_type"]
        if "label" in update_data and update_data["label"] is not None:
            record.label = update_data["label"].strip()
        if "folio" in update_data:
            record.folio = update_data["folio"]
        if "broker" in update_data:
            record.broker = update_data["broker"]
        if "meta" in update_data:
            record.meta = update_data["meta"]
        if "quantity" in update_data and update_data["quantity"] is not None:
            record.quantity = _decimal(update_data["quantity"])
        if "sell_rate" in update_data and update_data["sell_rate"] is not None:
            record.sell_rate = _decimal(update_data["sell_rate"])
        if "buy_rate" in update_data and update_data["buy_rate"] is not None:
            record.buy_rate = _decimal(update_data["buy_rate"])
        if "trade_value" in update_data and update_data["trade_value"] is not None:
            record.trade_value = _decimal(update_data["trade_value"]).quantize(Decimal("0.01"))
        if "purchase_value" in update_data and update_data["purchase_value"] is not None:
            record.purchase_value = _decimal(update_data["purchase_value"]).quantize(
                Decimal("0.01")
            )
        if "short_term_gain" in update_data and update_data["short_term_gain"] is not None:
            record.short_term_gain = _decimal(update_data["short_term_gain"]).quantize(
                Decimal("0.01")
            )
        if "long_term_gain" in update_data and update_data["long_term_gain"] is not None:
            record.long_term_gain = _decimal(update_data["long_term_gain"]).quantize(
                Decimal("0.01")
            )
        if (
            "short_term_holding_period_days" in update_data
            and update_data["short_term_holding_period_days"] is not None
        ):
            record.short_term_holding_period_days = update_data["short_term_holding_period_days"]
        if (
            "long_term_holding_period_days" in update_data
            and update_data["long_term_holding_period_days"] is not None
        ):
            record.long_term_holding_period_days = update_data["long_term_holding_period_days"]
        if "trade_type" in update_data and update_data["trade_type"] is not None:
            record.trade_type = update_data["trade_type"]
        if "sale_reason" in update_data:
            record.sale_reason = update_data["sale_reason"]

        if (
            "trade_value" in update_data
            or "purchase_value" in update_data
            or "realized_gain" in update_data
        ):
            if update_data.get("realized_gain") is not None:
                record.realized_gain = _decimal(update_data["realized_gain"]).quantize(
                    Decimal("0.01")
                )
            else:
                record.realized_gain = (record.trade_value - record.purchase_value).quantize(
                    Decimal("0.01")
                )
