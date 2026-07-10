from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from io import StringIO

import pandas as pd
import requests

from app.services.nse_eod_client import NSE_HOME_URL, create_nse_session

logger = logging.getLogger(__name__)

NIFTY_50_SYMBOL = "NIFTY 50"
NSE_INDEX_HISTORICAL_URL = (
    "https://www.nseindia.com/api/historicalOR/indicesHistory"
)
NSE_INDEX_HISTORICAL_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/58.0.3029.110 Safari/537.3"
    ),
    "Accept": "application/json, text/csv, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": "https://www.nseindia.com/reports-indices-historical-index-data",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "DNT": "1",
    "X-Requested-With": "XMLHttpRequest",
}
HISTORICAL_CHUNK_DAYS = 365


def create_nse_index_session() -> requests.Session:
    session = create_nse_session()
    session.headers.update(NSE_INDEX_HISTORICAL_HEADERS)
    session.get(NSE_HOME_URL, timeout=30)
    return session


def _normalize_date_column(series: pd.Series) -> pd.Series:
    parsed = pd.to_datetime(series, format="%d-%b-%Y", errors="coerce")
    if parsed.isna().all():
        parsed = pd.to_datetime(series, errors="coerce")
    return parsed.dt.date


def _find_close_column(columns: list[str]) -> str | None:
    normalized = {column: column.strip().upper() for column in columns}
    for column, upper in normalized.items():
        if upper in {"CLOSE", "CLOSE_INDEX_VAL", "CLOSING INDEX VALUE", "EOD_CLOSE_INDEX_VAL"}:
            return column
        if "CLOSE" in upper:
            return column
    return None


def _find_date_column(columns: list[str]) -> str | None:
    normalized = {column: column.strip().upper() for column in columns}
    for column, upper in normalized.items():
        if upper in {"TIMESTAMP", "INDEX DATE", "DATE", "TRADE_DATE", "EOD_TIMESTAMP"}:
            return column
        if "DATE" in upper:
            return column
    return None


def parse_index_historical_payload(
    payload: str,
    symbol: str = NIFTY_50_SYMBOL,
) -> list[dict]:
    text = payload.strip()
    if not text:
        return []

    if text.startswith("{"):
        data = json.loads(text)
        if isinstance(data, dict) and isinstance(data.get("data"), list):
            frame = pd.DataFrame(data["data"])
        else:
            return []
    else:
        frame = pd.read_csv(StringIO(text), encoding="utf-8", thousands=",")

    if frame.empty:
        return []

    date_column = _find_date_column(list(frame.columns))
    close_column = _find_close_column(list(frame.columns))
    if not date_column or not close_column:
        raise ValueError("Unexpected NSE index historical payload shape.")

    frame = frame[[date_column, close_column]].copy()
    frame.columns = ["trade_date", "close"]
    frame["trade_date"] = _normalize_date_column(frame["trade_date"])
    frame["close"] = pd.to_numeric(
        frame["close"].astype(str).str.replace(",", "", regex=False),
        errors="coerce",
    )
    frame = frame.dropna(subset=["trade_date", "close"])

    rows: list[dict] = []
    for _, row in frame.iterrows():
        rows.append(
            {
                "symbol": symbol.upper(),
                "trade_date": row["trade_date"],
                "close": float(row["close"]),
            }
        )
    return rows


def fetch_index_historical_chunk(
    session: requests.Session,
    symbol: str,
    from_date: date,
    to_date: date,
) -> list[dict]:
    params = {
        "indexType": symbol,
        "from": from_date.strftime("%d-%m-%Y"),
        "to": to_date.strftime("%d-%m-%Y"),
    }
    response = session.get(NSE_INDEX_HISTORICAL_URL, params=params, timeout=60)
    response.raise_for_status()
    return parse_index_historical_payload(response.text, symbol=symbol)


def download_index_historical(
    symbol: str,
    from_date: date,
    to_date: date,
    session: requests.Session | None = None,
) -> list[dict]:
    if from_date > to_date:
        return []

    owns_session = session is None
    if owns_session:
        session = create_nse_index_session()

    rows: list[dict] = []
    chunk_end = to_date
    remaining_days = (to_date - from_date).days + 1

    try:
        while remaining_days > 0 and chunk_end >= from_date:
            chunk_span = min(HISTORICAL_CHUNK_DAYS, remaining_days)
            chunk_start = max(from_date, chunk_end - timedelta(days=chunk_span - 1))
            chunk_rows = fetch_index_historical_chunk(
                session,
                symbol,
                chunk_start,
                chunk_end,
            )
            rows.extend(chunk_rows)
            chunk_end = chunk_start - timedelta(days=1)
            remaining_days -= chunk_span
    finally:
        if owns_session:
            session.close()

    deduped: dict[tuple[str, date], dict] = {}
    for row in rows:
        key = (row["symbol"], row["trade_date"])
        deduped[key] = row
    return list(deduped.values())
