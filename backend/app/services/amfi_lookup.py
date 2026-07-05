from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Optional

import requests

AMFI_NAV_URL = "https://portal.amfiindia.com/spages/NAVAll.txt"

SCHEME_HEADER = re.compile(
    r"^(Open Ended Schemes|Close Ended Schemes)\((.+)\)$",
    flags=re.IGNORECASE,
)
ISIN_PATTERN = re.compile(r"\b[A-Z]{2}[A-Z0-9]{10}\b", flags=re.IGNORECASE)
MUTUAL_FUND_ISIN = re.compile(r"^INF[A-Z0-9]{9}$", flags=re.IGNORECASE)
SCHEME_CODE_PATTERN = re.compile(r"^\d+$")


@dataclass(frozen=True)
class AmfiFundInfo:
    scheme_code: str
    amc: str
    fund_name: str
    nav: str
    nav_date: str
    scheme_category: str
    asset_class: str
    fund_type: str


def parse_amfi_nav_date(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        return ""

    try:
        return datetime.strptime(stripped, "%d-%b-%Y").date().isoformat()
    except ValueError:
        return stripped


def fetch_amfi_lines() -> list[str]:
    response = requests.get(AMFI_NAV_URL, timeout=30)
    if response.status_code != 200:
        return []
    return response.text.splitlines()


@lru_cache(maxsize=1)
def fetch_amfi_index() -> dict[str, AmfiFundInfo]:
    return build_amfi_index(fetch_amfi_lines())


def clear_amfi_index_cache() -> None:
    fetch_amfi_index.cache_clear()


def build_amfi_index(lines: list[str]) -> dict[str, AmfiFundInfo]:
    index: dict[str, AmfiFundInfo] = {}
    current_category = ""
    current_amc = ""

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        scheme_match = SCHEME_HEADER.match(stripped)
        if scheme_match:
            current_category = stripped
            continue

        if ";" not in stripped and stripped.endswith("Mutual Fund"):
            current_amc = stripped
            continue

        if ";" not in stripped:
            continue

        row = stripped.split(";")
        if len(row) < 5:
            continue

        scheme_code = row[0].strip()
        if not SCHEME_CODE_PATTERN.match(scheme_code):
            continue

        scheme_name = row[3].strip()
        nav = row[4].strip()
        if not scheme_name or scheme_name.lower() == "scheme name":
            continue
        if not nav or nav.lower() == "net asset value":
            continue

        nav_date = parse_amfi_nav_date(row[5]) if len(row) > 5 else ""
        asset_class, fund_type = classify_scheme(current_category, scheme_name)
        cleaned_name = clean_fund_name(scheme_name)

        info = AmfiFundInfo(
            scheme_code=scheme_code,
            amc=current_amc,
            fund_name=cleaned_name,
            nav=nav,
            nav_date=nav_date,
            scheme_category=current_category,
            asset_class=asset_class,
            fund_type=fund_type,
        )

        for cell in row[1:3]:
            cell = cell.strip()
            if cell and cell != "-":
                for isin_match in ISIN_PATTERN.findall(cell):
                    isin_upper = isin_match.upper()
                    if MUTUAL_FUND_ISIN.match(isin_upper):
                        index[isin_upper] = info

    return index


def classify_scheme(scheme_category: str, fund_name: str) -> tuple[str, str]:
    fund_type = "Other"
    broad = scheme_category

    scheme_match = SCHEME_HEADER.match(scheme_category.strip())
    if scheme_match:
        inner = scheme_match.group(2).strip()
        if " - " in inner:
            broad, fund_type = inner.split(" - ", 1)
        else:
            broad = inner
            fund_type = inner

    fund_type = fund_type.strip()
    broad_upper = broad.upper()
    name_upper = fund_name.upper()
    combined = f"{broad_upper} {fund_type.upper()} {name_upper}"

    if broad_upper.startswith("DEBT SCHEME") or broad_upper == "DEBT" or "LIQUID" in combined:
        return "Debt", fund_type

    if "GOLD" in combined and (
        "FOF" in broad_upper
        or "FOF" in fund_type.upper()
        or "GOLD" in name_upper
    ):
        return "Gold", fund_type

    if "GOLD" in name_upper:
        return "Gold", fund_type

    return "Equity", fund_type


def clean_fund_name(fund_name: str) -> str:
    cleaned_text = re.sub(r"\s*\(.*?\)", "", fund_name)
    cleaned_text = re.sub(
        r"\b(DIRECT|PLAN|GROWTH|OPTION)\b",
        "",
        cleaned_text,
        flags=re.IGNORECASE,
    )
    cleaned_text = re.sub(r"\s*-\s*", " ", cleaned_text)
    return re.sub(r"\s+", " ", cleaned_text).strip()


def lookup_isin(
    isin: Optional[str],
    index: Optional[dict[str, AmfiFundInfo]] = None,
) -> Optional[AmfiFundInfo]:
    if not isin:
        return None

    lookup = index if index is not None else fetch_amfi_index()
    return lookup.get(isin.upper())


def search_isin(
    isin: Optional[str],
    amfi_data: list[str] | dict[str, AmfiFundInfo] | None = None,
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    if isinstance(amfi_data, dict):
        info = lookup_isin(isin, amfi_data)
    elif isinstance(amfi_data, list) and amfi_data:
        info = lookup_isin(isin, build_amfi_index(amfi_data))
    else:
        info = lookup_isin(isin)

    if info is None:
        return None, None, None

    return info.amc, info.fund_name, info.nav
