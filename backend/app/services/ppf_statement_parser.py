from datetime import date
from decimal import Decimal, InvalidOperation
import re
from typing import Any

import xlrd
from xlrd import xldate_as_datetime

ACCOUNT_LABEL = "account number"
HEADER_SR_NO = "sr no."
STATEMENT_TITLE = "ppf detailed account statement"

ACCOUNT_PATTERN = re.compile(
    r"^\s*(\d+)\(([A-Z]+)\)\s*-\s*(.+?)\s*$",
    re.IGNORECASE,
)


class PpfStatementParseError(ValueError):
    pass


def _cell_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _parse_amount(value: Any) -> Decimal:
    text = _cell_text(value)
    if not text or text == "-":
        return Decimal("0")
    normalized = text.replace(",", "")
    try:
        return Decimal(normalized)
    except InvalidOperation as exc:
        raise PpfStatementParseError(f"Invalid amount: {text}") from exc


def _parse_date(value: Any) -> date:
    if isinstance(value, float):
        try:
            return xldate_as_datetime(value, 0).date()
        except Exception as exc:
            raise PpfStatementParseError("Invalid Excel date value.") from exc

    text = _cell_text(value)
    match = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", text)
    if not match:
        raise PpfStatementParseError(f"Invalid transaction date: {text or '(empty)'}")
    day, month, year = match.groups()
    return date(int(year), int(month), int(day))


def _classify_transaction(remarks: str, deposit: Decimal, withdrawal: Decimal) -> str:
    normalized = remarks.lower()
    if "int.pd" in normalized or "interest" in normalized:
        return "interest"
    if withdrawal > 0:
        return "withdrawal"
    if deposit > 0:
        return "deposit"
    return "other"


def _find_sheet(workbook: xlrd.Book) -> xlrd.sheet.Sheet:
    for index in range(workbook.nsheets):
        sheet = workbook.sheet_by_index(index)
        for row_index in range(min(sheet.nrows, 5)):
            for col_index in range(sheet.ncols):
                text = _cell_text(sheet.cell_value(row_index, col_index)).lower()
                if STATEMENT_TITLE in text:
                    return sheet
    if workbook.nsheets:
        return workbook.sheet_by_index(0)
    raise PpfStatementParseError("Workbook has no sheets.")


def _parse_account_row(row_values: list[Any]) -> dict[str, str]:
    for col_index, value in enumerate(row_values):
        label = _cell_text(value).lower()
        if label != ACCOUNT_LABEL:
            continue
        account_text = ""
        for candidate in row_values[col_index + 1 :]:
            candidate_text = _cell_text(candidate)
            if candidate_text:
                account_text = candidate_text
                break
        match = ACCOUNT_PATTERN.match(account_text)
        if not match:
            raise PpfStatementParseError(
                "Invalid PPF statement format. Could not parse account number row."
            )
        account_number, currency, account_holder = match.groups()
        return {
            "account_number": account_number,
            "currency": currency.upper(),
            "account_holder": account_holder.strip(),
        }
    raise PpfStatementParseError(
        "Invalid PPF statement format. Missing account number row."
    )


def _find_header_row(sheet: xlrd.sheet.Sheet) -> tuple[int, dict[str, int]]:
    for row_index in range(sheet.nrows):
        labels = [_cell_text(sheet.cell_value(row_index, col)).lower() for col in range(sheet.ncols)]
        if HEADER_SR_NO not in labels:
            continue
        column_map: dict[str, int] = {}
        for col_index, label in enumerate(labels):
            if label.startswith("sr no"):
                column_map["sr_no"] = col_index
            elif label.startswith("transaction date"):
                column_map["transaction_date"] = col_index
            elif label.startswith("cheque number"):
                column_map["cheque_number"] = col_index
            elif label.startswith("transaction remarks"):
                column_map["remarks"] = col_index
            elif label.startswith("withdrawal amount"):
                column_map["withdrawal_amount"] = col_index
            elif label.startswith("deposit amount"):
                column_map["deposit_amount"] = col_index
            elif label.startswith("balance"):
                column_map["balance"] = col_index
        required = {
            "sr_no",
            "transaction_date",
            "withdrawal_amount",
            "deposit_amount",
            "balance",
        }
        if required.issubset(column_map):
            return row_index, column_map
    raise PpfStatementParseError(
        "Invalid PPF statement format. Missing transaction header row."
    )


def parse_ppf_statement_xls(contents: bytes) -> dict[str, Any]:
    try:
        workbook = xlrd.open_workbook(file_contents=contents)
    except Exception as exc:
        raise PpfStatementParseError("Unable to read Excel file.") from exc

    sheet = _find_sheet(workbook)

    account: dict[str, str] | None = None
    for row_index in range(sheet.nrows):
        row_values = [sheet.cell_value(row_index, col) for col in range(sheet.ncols)]
        label_cells = [_cell_text(value).lower() for value in row_values]
        if ACCOUNT_LABEL in label_cells:
            account = _parse_account_row(row_values)
            break

    if account is None:
        raise PpfStatementParseError(
            "Invalid PPF statement format. Missing account number row."
        )

    header_row_index, columns = _find_header_row(sheet)
    transactions: list[dict[str, Any]] = []

    for row_index in range(header_row_index + 1, sheet.nrows):
        sr_text = _cell_text(sheet.cell_value(row_index, columns["sr_no"]))
        if not sr_text:
            continue

        try:
            sr_no = int(float(sr_text))
        except ValueError as exc:
            raise PpfStatementParseError(f"Invalid serial number: {sr_text}") from exc

        transaction_date = _parse_date(
            sheet.cell_value(row_index, columns["transaction_date"])
        )
        cheque_number = _cell_text(
            sheet.cell_value(row_index, columns.get("cheque_number", columns["sr_no"]))
        )
        remarks = _cell_text(
            sheet.cell_value(row_index, columns.get("remarks", columns["sr_no"]))
        )
        withdrawal_amount = _parse_amount(
            sheet.cell_value(row_index, columns["withdrawal_amount"])
        )
        deposit_amount = _parse_amount(
            sheet.cell_value(row_index, columns["deposit_amount"])
        )
        balance = _parse_amount(sheet.cell_value(row_index, columns["balance"]))

        transactions.append(
            {
                "account_number": account["account_number"],
                "sr_no": sr_no,
                "transaction_date": transaction_date.isoformat(),
                "cheque_number": cheque_number or None,
                "remarks": remarks or None,
                "withdrawal_amount": str(withdrawal_amount),
                "deposit_amount": str(deposit_amount),
                "balance": str(balance),
                "transaction_type": _classify_transaction(
                    remarks,
                    deposit_amount,
                    withdrawal_amount,
                ),
            }
        )

    if not transactions:
        raise PpfStatementParseError("PPF statement has no transactions.")

    latest_balance = Decimal(transactions[-1]["balance"])
    account["current_balance"] = str(latest_balance)

    return {
        "account": account,
        "transactions": transactions,
    }
