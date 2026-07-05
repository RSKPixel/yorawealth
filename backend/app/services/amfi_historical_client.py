from __future__ import annotations

import re
from datetime import date, datetime
from typing import Optional

import requests

from app.services.amfi_lookup import clean_fund_name

AMFI_NAV_HISTORY_URL = "https://www.amfiindia.com/api/nav-history"
AMFI_REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.amfiindia.com/",
    "Accept": "application/json",
}


def fetch_nav_history(
    scheme_code: str,
    from_date: date,
    to_date: date,
) -> dict:
    params = {
        "query_type": "historical_period",
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "sd_id": scheme_code,
    }
    response = requests.get(
        AMFI_NAV_HISTORY_URL,
        params=params,
        headers=AMFI_REQUEST_HEADERS,
        timeout=45,
    )
    response.raise_for_status()

    try:
        payload = response.json()
    except ValueError as error:
        raise ValueError("AMFI nav-history returned non-JSON response") from error

    return normalize_nav_history_payload(payload)


def normalize_nav_history_payload(payload: object) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Unexpected AMFI nav-history response")

    data = payload.get("data")
    if isinstance(data, dict):
        return payload

    error_text = payload.get("error")
    if error_text:
        details = payload.get("details") or error_text
        raise ValueError(f"AMFI nav-history error: {details}")

    message = payload.get("message")
    if message:
        # e.g. "No records to display" for empty ranges or unknown schemes.
        return {
            "data": {
                "mf_name": "",
                "scheme_name": "",
                "date_range": "",
                "nav_groups": [],
            }
        }

    raise ValueError("Unexpected AMFI nav-history response")


def pick_nav_group(nav_groups: list[dict], fund_name: str) -> Optional[dict]:
    if not nav_groups:
        return None
    if len(nav_groups) == 1:
        return nav_groups[0]

    target = _normalize_name(fund_name)
    best_group = nav_groups[0]
    best_score = (-1, -1)

    for group in nav_groups:
        nav_name = group.get("nav_name", "")
        score = _name_match_score(target, _normalize_name(nav_name))
        record_count = len(group.get("historical_records") or [])
        rank = (score, record_count)
        if rank > best_score:
            best_score = rank
            best_group = group

    return best_group


def parse_nav_records(
    payload: dict,
    fund_name: str,
    scheme_code: str,
    isin: str,
) -> list[dict]:
    data = payload.get("data") or {}
    nav_groups = data.get("nav_groups") or []
    group = pick_nav_group(nav_groups, fund_name)
    if group is None:
        return []

    mf_name = data.get("mf_name") or ""
    scheme_name = group.get("nav_name") or fund_name
    records: list[dict] = []

    for row in group.get("historical_records") or []:
        nav_date = _parse_date(row.get("date"))
        nav_value = row.get("nav")
        if nav_date is None or nav_value in (None, ""):
            continue

        source_updated_at = _parse_upload_time(row.get("upload_time"))
        records.append(
            {
                "date": nav_date,
                "scheme_code": scheme_code,
                "isin": isin.upper(),
                "scheme_name": scheme_name,
                "amc_name": mf_name,
                "nav": float(nav_value),
                "source_updated_at": source_updated_at,
            }
        )

    return records


def _normalize_name(value: str) -> str:
    cleaned = clean_fund_name(value or "")
    cleaned = re.sub(r"[^a-z0-9 ]", " ", cleaned.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def _name_match_score(target: str, candidate: str) -> int:
    if not target or not candidate:
        return 0
    if target == candidate:
        return 100
    if target in candidate or candidate in target:
        return 80

    target_tokens = set(target.split())
    candidate_tokens = set(candidate.split())
    if not target_tokens or not candidate_tokens:
        return 0

    overlap = len(target_tokens & candidate_tokens)
    return int((overlap / max(len(target_tokens), len(candidate_tokens))) * 60)


def _parse_date(value: object) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return None


def _parse_upload_time(value: object) -> Optional[datetime]:
    if not value:
        return None
    text = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None
