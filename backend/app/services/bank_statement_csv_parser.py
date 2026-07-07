from __future__ import annotations

import csv
import hashlib
import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

from app.services.tradebook_templates import normalize_csv_header

BANK_STATEMENT_CSV_COLUMNS: tuple[str, ...] = (
    "date",
    "desc",
    "ref",
    "debit",
    "credit",
)

DATE_FORMATS = (
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d-%b-%Y",
    "%d-%b-%y",
)


class BankStatementParseError(Exception):
    pass


def compute_row_hash(
    transaction_date: date,
    description: str,
    reference: Optional[str],
    credit: Decimal,
    debit: Decimal,
) -> str:
    normalized = "|".join(
        [
            transaction_date.isoformat(),
            description.strip().lower(),
            (reference or "").strip().lower(),
            f"{credit:.2f}",
            f"{debit:.2f}",
        ]
    )
    return hashlib.sha256(normalized.encode()).hexdigest()


def _normalize_amount(value: Any) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, str) and not value.strip():
        return Decimal("0")
    if isinstance(value, (int, float)):
        amount = Decimal(str(value))
    else:
        cleaned = re.sub(r"[^\d.\-]", "", str(value))
        if not cleaned or cleaned in {".", "-", "-."}:
            raise BankStatementParseError("Invalid amount in CSV row.")
        amount = Decimal(cleaned)
    if amount < 0:
        raise BankStatementParseError("Amounts must be non-negative.")
    return amount.quantize(Decimal("0.01"))


def _parse_date(value: str) -> date:
    stripped = value.strip()
    if not stripped:
        raise BankStatementParseError("Missing transaction date.")

    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(stripped, fmt).date()
        except ValueError:
            continue

    raise BankStatementParseError(f"Invalid transaction date: {value}")


def _normalize_row(raw: dict[str, Any]) -> dict:
    transaction_date = _parse_date(str(raw.get("date") or ""))

    description = str(raw.get("desc") or "").strip()
    if not description:
        raise BankStatementParseError("Missing transaction description.")

    reference_raw = raw.get("ref")
    reference = (
        str(reference_raw).strip()
        if reference_raw not in (None, "", "null")
        else None
    )
    if reference:
        reference = reference[:128]

    try:
        credit = _normalize_amount(raw.get("credit", 0))
        debit = _normalize_amount(raw.get("debit", 0))
    except InvalidOperation as error:
        raise BankStatementParseError("Invalid amount in CSV row.") from error

    if credit > 0 and debit > 0:
        raise BankStatementParseError("Transaction cannot have both credit and debit.")
    if credit == 0 and debit == 0:
        raise BankStatementParseError("Transaction must have a credit or debit amount.")

    description = description[:512]
    row_hash = compute_row_hash(transaction_date, description, reference, credit, debit)

    return {
        "transaction_date": transaction_date.isoformat(),
        "description": description,
        "reference": reference,
        "credit": str(credit),
        "debit": str(debit),
        "row_hash": row_hash,
    }


def _decode_csv(contents: bytes) -> str:
    if not contents:
        raise BankStatementParseError("Statement file is empty.")

    try:
        return contents.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise BankStatementParseError("CSV must be UTF-8 encoded.") from error


def _read_header(reader: csv.reader) -> list[str]:
    try:
        header_row = next(reader)
    except StopIteration as error:
        raise BankStatementParseError("CSV has no header row.") from error

    if not header_row or all(not cell.strip() for cell in header_row):
        raise BankStatementParseError("CSV has no header row.")

    return [normalize_csv_header(column) for column in header_row]


def validate_bank_statement_csv(contents: bytes) -> None:
    text = _decode_csv(contents)
    reader = csv.reader(io.StringIO(text))
    actual_columns = _read_header(reader)
    expected_columns = [normalize_csv_header(column) for column in BANK_STATEMENT_CSV_COLUMNS]

    missing = [column for column in expected_columns if column not in actual_columns]
    if missing:
        raise BankStatementParseError(
            "Invalid bank statement CSV. Missing columns: "
            + ", ".join(missing)
            + ". Expected: "
            + ", ".join(BANK_STATEMENT_CSV_COLUMNS)
            + "."
        )

    data_rows = [row for row in reader if any(cell.strip() for cell in row)]
    if not data_rows:
        raise BankStatementParseError("CSV has no transaction rows.")


def parse_bank_statement_csv(contents: bytes) -> list[dict]:
    validate_bank_statement_csv(contents)

    text = _decode_csv(contents)
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise BankStatementParseError("CSV has no header row.")

    column_map = {
        normalize_csv_header(name): name
        for name in reader.fieldnames
        if name
    }

    normalized: list[dict] = []
    seen_hashes: set[str] = set()

    for row_number, raw_row in enumerate(reader, start=2):
        if not any((value or "").strip() for value in raw_row.values()):
            continue

        mapped = {
            column: (raw_row.get(column_map[column]) or "").strip()
            for column in BANK_STATEMENT_CSV_COLUMNS
        }

        try:
            row = _normalize_row(mapped)
        except BankStatementParseError as error:
            raise BankStatementParseError(
                f"Invalid row {row_number}: {error}"
            ) from error

        row_hash = row["row_hash"]
        if row_hash in seen_hashes:
            continue
        seen_hashes.add(row_hash)
        normalized.append(row)

    if not normalized:
        raise BankStatementParseError("No valid transactions found in CSV.")

    return normalized
