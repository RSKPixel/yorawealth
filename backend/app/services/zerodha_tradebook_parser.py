from __future__ import annotations

import csv
import io
from datetime import date
from decimal import Decimal

from app.services.tradebook_templates import (
    normalize_csv_header,
    validate_zerodha_tradebook_csv,
)


def _decimal(value: str | Decimal | float) -> Decimal:
    return Decimal(str(value))


def _normalize_trade_type(value: str) -> str:
    normalized = value.strip().lower()
    if normalized == "buy":
        return "BUY"
    if normalized == "sell":
        return "SELL"
    raise ValueError("trade_type must be buy or sell.")


def parse_zerodha_tradebook_csv(contents: bytes) -> list[dict]:
    validate_zerodha_tradebook_csv(contents)
    text = contents.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise ValueError("Tradebook CSV has no header row.")

    field_map = {
        normalize_csv_header(name): name
        for name in reader.fieldnames
        if name
    }
    rows: list[dict] = []

    for raw_row in reader:
        if not any((value or "").strip() for value in raw_row.values()):
            continue

        normalized_row = {
            key: (raw_row.get(original) or "").strip()
            for key, original in field_map.items()
        }
        quantity = _decimal(normalized_row["quantity"]).quantize(Decimal("1"))
        price = _decimal(normalized_row["price"])
        trade_value = (quantity * price).quantize(Decimal("0.01"))

        rows.append(
            {
                "symbol": normalized_row["symbol"].upper(),
                "isin": normalized_row["isin"].upper(),
                "exchange": normalized_row["exchange"].upper(),
                "segment": normalized_row.get("segment") or None,
                "series": normalized_row.get("series") or None,
                "transaction_date": date.fromisoformat(normalized_row["trade_date"]),
                "trade_type": _normalize_trade_type(normalized_row["trade_type"]),
                "quantity": quantity,
                "price": price,
                "trade_value": trade_value,
                "trade_id": normalized_row["trade_id"],
                "order_id": normalized_row.get("order_id") or None,
                "order_execution_time": normalized_row.get("order_execution_time") or None,
            }
        )

    if not rows:
        raise ValueError("Tradebook CSV has no transaction rows.")

    return rows
