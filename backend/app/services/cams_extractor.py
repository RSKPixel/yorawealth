from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
import pdfplumber

from app.services.amfi_lookup import fetch_amfi_index, lookup_isin

FOLIO_MATCH = re.compile(r"Folio No:\s*(.*?)\s*(KYC|PAN)", flags=re.IGNORECASE)
FUND_NAME = re.compile(r".*[Fund].*ISIN.*", flags=re.IGNORECASE)
# Amount must look like a rupee value — not bare SIP instalment numbers ("No - 1").
# Supports lakh grouping (1,58,792.06), decimals (49,997.50), and redemptions ((12,619.19)).
_CAMS_AMOUNT = (
    r"\(?\d{1,3}(?:,\d{2,3})+(?:\.\d+)?\)?"
    r"|\(?\d+(?:\.\d{2,})\)?"
    r"|\d{4,}"
)
_CAMS_NUM = r"[\d\(\,\.\)]+"
TRANS_DETAILS = re.compile(
    rf"^(?P<date>\d{{2}}-\w{{3}}-\d{{4}})"
    rf"(?P<description>.+?)"
    rf"\s(?P<amount>{_CAMS_AMOUNT})"
    rf"\s(?P<units>{_CAMS_NUM})"
    rf"\s(?P<nav>{_CAMS_NUM})"
    rf"\s(?P<balance>{_CAMS_NUM})$"
)
ISIN_REGEX = re.compile(r"\b[A-Z]{2}[A-Z0-9]{10}\b", flags=re.IGNORECASE)
CLOSING_BALANCE = re.compile(
    r"Closing Unit Balance:\s*(?P<units>[\d,\.]+)\s*"
    r"NAV on\s*(?P<nav_date>\d{2}-\w{3}-\d{4}):\s*INR\s*(?P<nav>[\d,\.]+)\s*"
    r"Total Cost Value:\s*(?P<cost>[\d,\.]+)\s*"
    r"Market Value on\s*\d{2}-\w{3}-\d{4}:\s*INR\s*(?P<market_value>[\d,\.]+)"
)

OUTPUT_COLUMNS = [
    "client_pan",
    "folio",
    "fund_name",
    "amc",
    "assetclass",
    "symbol",
    "name",
    "isin",
    "transaction_date",
    "trade_type",
    "nav",
    "quantity",
    "trade_value",
]


def _clean_numeric_series(series: pd.Series) -> pd.Series:
    cleaned = (
        series.astype(str)
        .str.replace(",", "", regex=False)
        .str.replace("(", "-", regex=False)
        .str.replace(")", "", regex=False)
    )
    return cleaned.astype(float)


def _read_pdf_text(pdf_path: Path, password: Optional[str]) -> str:
    with pdfplumber.open(str(pdf_path), password=password) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def _open_pdf_text(pdf_path: Path, password: Optional[str], client_pan: Optional[str]) -> str:
    candidates: list[Optional[str]] = []
    if password:
        candidates.append(password)
    if client_pan:
        candidates.extend([client_pan, client_pan.lower(), client_pan.upper()])
    candidates.append(None)

    seen: set[Optional[str]] = set()
    last_error: Exception | None = None

    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)

        try:
            return _read_pdf_text(pdf_path, candidate)
        except Exception as error:
            last_error = error

    if last_error is not None:
        raise last_error

    return ""


def _parse_cams_number(raw: str) -> float:
    return float(raw.replace(",", ""))


def extract_cams_closing_balances(
    pdf_path: Path,
    password: Optional[str] = None,
    client_pan: Optional[str] = None,
) -> list[dict]:
    final_text = _open_pdf_text(pdf_path, password, client_pan)

    folio = ""
    isin = ""
    items: list[dict] = []

    for line in final_text.splitlines():
        folio_match = FOLIO_MATCH.match(line)
        if folio_match:
            folio = folio_match.group(1).strip().replace(" ", "")

        fund_match = FUND_NAME.match(line)
        if fund_match:
            isin_match = ISIN_REGEX.search(fund_match.group(0))
            if isin_match:
                isin = isin_match.group(0).upper()

        closing_match = CLOSING_BALANCE.search(line)
        if not closing_match or not folio or not isin:
            continue

        closing_units = _parse_cams_number(closing_match.group("units"))
        if closing_units <= 0:
            continue

        nav_date = datetime.strptime(closing_match.group("nav_date"), "%d-%b-%Y").date()
        items.append(
            {
                "client_pan": client_pan,
                "folio": folio,
                "isin": isin,
                "closing_units": round(closing_units, 3),
                "statement_nav": _parse_cams_number(closing_match.group("nav")),
                "statement_nav_date": nav_date.isoformat(),
                "total_cost_value": _parse_cams_number(closing_match.group("cost")),
                "market_value": _parse_cams_number(closing_match.group("market_value")),
                "source_filename": pdf_path.name,
            }
        )

    return items


def extract_cams_pdf(
    pdf_path: Path,
    password: Optional[str] = None,
    client_pan: Optional[str] = None,
) -> list[dict]:
    final_text = _open_pdf_text(pdf_path, password, client_pan)
    amfi_index = fetch_amfi_index()

    folio = ""
    isin = ""
    line_items: list[list] = []

    for line in final_text.splitlines():
        folio_match = FOLIO_MATCH.match(line)
        if folio_match:
            folio = folio_match.group(1)

        fund_match = FUND_NAME.match(line)
        if fund_match:
            fund_line = fund_match.group(0)
            isin_match = ISIN_REGEX.search(fund_line)
            if isin_match:
                isin = isin_match.group(0)

        info = lookup_isin(isin, amfi_index)
        amc_name = info.amc if info else ""
        fund_name = info.fund_name if info else ""
        asset_class = info.asset_class if info else ""

        transaction_match = TRANS_DETAILS.match(line)
        if not transaction_match:
            continue

        line_items.append(
            [
                folio,
                isin,
                fund_name,
                amc_name,
                asset_class,
                transaction_match.group("date"),
                transaction_match.group("description"),
                transaction_match.group("amount"),
                transaction_match.group("units"),
                transaction_match.group("nav"),
                transaction_match.group("balance"),
            ]
        )

    if not line_items:
        return []

    df = pd.DataFrame(
        line_items,
        columns=[
            "folio",
            "isin",
            "fund_name",
            "amc_name",
            "assetclass",
            "date",
            "description",
            "investment_amount",
            "units",
            "nav",
            "unitbalance",
        ],
    )

    df["investment_amount"] = _clean_numeric_series(df["investment_amount"])
    df["units"] = _clean_numeric_series(df["units"]).round(3)
    df["nav"] = _clean_numeric_series(df["nav"])
    df["unitbalance"] = _clean_numeric_series(df["unitbalance"]).round(3)
    df["client_pan"] = client_pan
    df["folio"] = df["folio"].str.replace("Folio No: ", "", regex=False).str.replace(" ", "", regex=False)
    df["isin"] = df["isin"].str.upper()
    df["date"] = pd.to_datetime(df["date"], format="%d-%b-%Y")
    df["trade_type"] = df["units"].apply(lambda value: "IN" if value > 0 else "OUT")

    result = pd.DataFrame(columns=OUTPUT_COLUMNS)
    result["client_pan"] = df["client_pan"]
    result["folio"] = df["folio"]
    result["fund_name"] = df["fund_name"]
    result["amc"] = df["amc_name"]
    result["assetclass"] = df["assetclass"].replace("", None)
    result["isin"] = df["isin"]
    result["transaction_date"] = df["date"].dt.strftime("%Y-%m-%d")
    result["trade_type"] = df["trade_type"]
    result["trade_value"] = df["investment_amount"]
    result["quantity"] = df["units"]
    result["nav"] = df["nav"]

    records = result.to_dict(orient="records")
    return [
        {
            key: (None if pd.isna(value) else value)
            for key, value in record.items()
        }
        for record in records
    ]
