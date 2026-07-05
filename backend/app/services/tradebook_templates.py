from __future__ import annotations

import csv
import io
from typing import Iterable

ZERODHA_TRADEBOOK_CSV_TEMPLATE_ID = "zerodha_tradebook_csv"

ZERODHA_TRADEBOOK_CSV_COLUMNS: tuple[str, ...] = (
    "symbol",
    "isin",
    "trade_date",
    "exchange",
    "segment",
    "series",
    "trade_type",
    "auction",
    "quantity",
    "price",
    "trade_id",
    "order_id",
    "order_execution_time",
)

ZERODHA_TRADEBOOK_SAMPLE_ROW: dict[str, str] = {
    "symbol": "BRITANNIA",
    "isin": "INE216A01030",
    "trade_date": "2021-01-14",
    "exchange": "NSE",
    "segment": "EQ",
    "series": "EQ",
    "trade_type": "buy",
    "auction": "false",
    "quantity": "14.000000",
    "price": "3669.000000",
    "trade_id": "891472",
    "order_id": "1000000003401272",
    "order_execution_time": "2021-01-14T09:49:28",
}


def normalize_csv_header(value: str) -> str:
    return value.strip().lstrip("\ufeff").lower()


def validate_zerodha_tradebook_filename(filename: str, client_id: str) -> None:
    if not client_id or not client_id.strip():
        raise ValueError("Set your Zerodha client ID in Settings → Profile.")

    normalized_name = filename.lower()
    normalized_client_id = client_id.strip().lower()
    expected_prefix = f"tradebook-{normalized_client_id}-"

    if expected_prefix not in normalized_name:
        upper_client_id = client_id.strip().upper()
        raise ValueError(
            f"Tradebook filename should include {upper_client_id} "
            f"(e.g. tradebook-{upper_client_id}-EQ.csv)."
        )


def validate_zerodha_tradebook_csv(contents: bytes) -> None:
    if not contents:
        raise ValueError("Selected file is empty.")

    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ValueError("Tradebook CSV must be UTF-8 encoded.") from error

    reader = csv.reader(io.StringIO(text))
    try:
        header_row = next(reader)
    except StopIteration as error:
        raise ValueError("Tradebook CSV has no header row.") from error

    if not header_row or all(not cell.strip() for cell in header_row):
        raise ValueError("Tradebook CSV has no header row.")

    actual_columns = [normalize_csv_header(column) for column in header_row]
    expected_columns = [normalize_csv_header(column) for column in ZERODHA_TRADEBOOK_CSV_COLUMNS]

    if actual_columns != expected_columns:
        missing = [
            column
            for column in expected_columns
            if column not in actual_columns
        ]
        if missing:
            raise ValueError(
                "Invalid Zerodha tradebook format. Missing columns: "
                + ", ".join(missing)
                + "."
            )

        raise ValueError(
            "Invalid Zerodha tradebook format. Expected header: "
            + ", ".join(ZERODHA_TRADEBOOK_CSV_COLUMNS)
            + "."
        )

    data_rows = [row for row in reader if any(cell.strip() for cell in row)]
    if not data_rows:
        raise ValueError("Tradebook CSV has no transaction rows.")

    _validate_sample_row(data_rows[0], header_row)


def _validate_sample_row(row: Iterable[str], header_row: list[str]) -> None:
    values = dict(zip(header_row, row))
    normalized = {
        normalize_csv_header(key): (value or "").strip()
        for key, value in values.items()
    }

    trade_type = normalized.get("trade_type", "").lower()
    if trade_type not in {"buy", "sell"}:
        raise ValueError(
            "Invalid Zerodha tradebook format. trade_type must be buy or sell."
        )

    trade_date = normalized.get("trade_date", "")
    if len(trade_date) != 10 or trade_date[4] != "-" or trade_date[7] != "-":
        raise ValueError(
            "Invalid Zerodha tradebook format. trade_date must be YYYY-MM-DD."
        )

    for numeric_field in ("quantity", "price"):
        raw_value = normalized.get(numeric_field, "")
        try:
            float(raw_value)
        except ValueError as error:
            raise ValueError(
                f"Invalid Zerodha tradebook format. {numeric_field} must be numeric."
            ) from error
