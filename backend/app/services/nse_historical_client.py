from __future__ import annotations

from datetime import date, timedelta
from io import StringIO

import pandas as pd
import requests

from app.services.nse_eod_client import NSE_HOME_URL, create_nse_session
from app.services.nse_eod_lookup import eod_symbol_candidates

NSE_HISTORICAL_URL = (
    "https://www.nseindia.com/api/historicalOR/generateSecurityWiseHistoricalData"
)
NSE_HISTORICAL_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/58.0.3029.110 Safari/537.3"
    ),
    "Accept": "text/csv, application/csv, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": "https://www.nseindia.com/market-data/historical-data",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "DNT": "1",
    "X-Requested-With": "XMLHttpRequest",
}
HISTORICAL_CHUNK_DAYS = 365


def create_nse_historical_session() -> requests.Session:
    session = create_nse_session()
    session.headers.update(NSE_HISTORICAL_HEADERS)
    session.get(NSE_HOME_URL, timeout=30)
    return session


def normalize_historical_symbol(symbol: str) -> str:
    candidates = eod_symbol_candidates(symbol)
    for candidate in candidates:
        if "-" not in candidate:
            return candidate
    return candidates[-1]


def _parse_historical_csv(text: str, symbol: str) -> list[dict]:
    df = pd.read_csv(StringIO(text), encoding="utf-8", thousands=",")
    if df.empty:
        return []

    column_names = [
        "symbol",
        "series",
        "trade_date",
        "prev_close",
        "open",
        "high",
        "low",
        "last",
        "close",
    ]
    if len(df.columns) < len(column_names):
        raise ValueError("Unexpected NSE historical CSV shape.")

    df = df.iloc[:, : len(column_names)].copy()
    df.columns = column_names
    df = df[["symbol", "trade_date", "prev_close", "open", "high", "low", "close"]]
    df["trade_date"] = pd.to_datetime(df["trade_date"], format="%d-%b-%Y").dt.date
    for column in ("prev_close", "open", "high", "low", "close"):
        df[column] = pd.to_numeric(df[column], errors="coerce")

    df = df.dropna(subset=["trade_date", "open", "high", "low", "close"])
    df["symbol"] = df["symbol"].astype(str).str.strip().str.upper()
    if df["symbol"].eq("").all():
        df["symbol"] = normalize_historical_symbol(symbol)

    rows: list[dict] = []
    for _, row in df.iterrows():
        prev_close = row["prev_close"]
        if pd.isna(prev_close):
            prev_close = float(row["close"])
        rows.append(
            {
                "symbol": row["symbol"] or normalize_historical_symbol(symbol),
                "trade_date": row["trade_date"],
                "prev_close": float(prev_close),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "name": None,
            }
        )
    return rows


def fetch_symbol_historical_chunk(
    session: requests.Session,
    symbol: str,
    from_date: date,
    to_date: date,
) -> list[dict]:
    api_symbol = normalize_historical_symbol(symbol)
    params = {
        "from": from_date.strftime("%d-%m-%Y"),
        "to": to_date.strftime("%d-%m-%Y"),
        "symbol": api_symbol,
        "type": "priceVolume",
        "series": "ALL",
        "csv": "true",
    }
    response = session.get(NSE_HISTORICAL_URL, params=params, timeout=60)
    response.raise_for_status()
    return _parse_historical_csv(response.text, api_symbol)


def download_symbol_historical(
    symbol: str,
    from_date: date,
    to_date: date,
    session: requests.Session | None = None,
) -> list[dict]:
    if from_date > to_date:
        return []

    owns_session = session is None
    if owns_session:
        session = create_nse_historical_session()

    rows: list[dict] = []
    chunk_end = to_date
    remaining_days = (to_date - from_date).days + 1

    try:
        while remaining_days > 0 and chunk_end >= from_date:
            chunk_span = min(HISTORICAL_CHUNK_DAYS, remaining_days)
            chunk_start = max(from_date, chunk_end - timedelta(days=chunk_span - 1))
            chunk_rows = fetch_symbol_historical_chunk(
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


def download_symbols_historical(
    symbols: list[str],
    from_date: date,
    to_date: date,
) -> tuple[list[dict], list[str]]:
    session = create_nse_historical_session()
    all_rows: list[dict] = []
    errors: list[str] = []

    try:
        for symbol in symbols:
            normalized = normalize_historical_symbol(symbol)
            try:
                rows = download_symbol_historical(
                    normalized,
                    from_date,
                    to_date,
                    session=session,
                )
                all_rows.extend(rows)
            except Exception as error:
                errors.append(f"{normalized}: {error}")
    finally:
        session.close()

    return all_rows, errors
