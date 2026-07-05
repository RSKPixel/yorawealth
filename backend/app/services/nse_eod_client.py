from __future__ import annotations

from datetime import date, datetime, timedelta
from io import StringIO

import pandas as pd
import requests

NSE_HOME_URL = "https://www.nseindia.com/"
NSE_BHAVCOPY_URL = (
    "https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_{bhavdate}.csv"
)
NSE_SECURITIES_URL = (
    "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
)
NSE_REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/94.0.4606.61 Safari/537.36"
    ),
}
MAX_LOOKBACK_DAYS = 10


def create_nse_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(NSE_REQUEST_HEADERS)
    session.get(NSE_HOME_URL, timeout=30)
    return session


def fetch_equity_names(session: requests.Session) -> dict[str, str]:
    response = session.get(NSE_SECURITIES_URL, timeout=45)
    response.raise_for_status()

    df = pd.read_csv(StringIO(response.text))
    if "NAME OF COMPANY" in df.columns:
        df = df.rename(columns={"NAME OF COMPANY": "NAME"})

    names: dict[str, str] = {}
    for _, row in df.iterrows():
        symbol = str(row.get("SYMBOL", "")).strip().upper()
        name = str(row.get("NAME", "")).strip()
        if symbol and name:
            names[symbol] = name
    return names


def fetch_bhavcopy_rows(
    session: requests.Session,
    bhavdate: str,
    equity_names: dict[str, str],
) -> list[dict]:
    link = NSE_BHAVCOPY_URL.format(bhavdate=bhavdate)
    response = session.get(link, timeout=45)
    response.raise_for_status()

    df = pd.read_csv(StringIO(response.text))
    df.columns = df.columns.str.strip()
    df = df.map(lambda value: value.strip() if isinstance(value, str) else value)
    df = df[df["SERIES"].isin(["EQ", "GB"])]

    columns = [
        "SYMBOL",
        "DATE1",
        "PREV_CLOSE",
        "OPEN_PRICE",
        "HIGH_PRICE",
        "LOW_PRICE",
        "CLOSE_PRICE",
    ]
    df = df[columns]
    df.columns = [
        "symbol",
        "trade_date",
        "prev_close",
        "open",
        "high",
        "low",
        "close",
    ]
    df["trade_date"] = pd.to_datetime(df["trade_date"], format="%d-%b-%Y").dt.date
    for column in ("prev_close", "open", "high", "low", "close"):
        df[column] = pd.to_numeric(df[column], errors="coerce")

    df = df.dropna(
        subset=["symbol", "trade_date", "prev_close", "open", "high", "low", "close"]
    )
    df["symbol"] = df["symbol"].str.strip().str.upper()
    df["name"] = df["symbol"].map(equity_names)

    rows: list[dict] = []
    for _, row in df.iterrows():
        rows.append(
            {
                "symbol": row["symbol"],
                "trade_date": row["trade_date"],
                "prev_close": float(row["prev_close"]),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "name": row["name"] if pd.notna(row["name"]) else None,
            }
        )
    return rows


def download_latest_nse_eod(
    start_date: date | None = None,
) -> tuple[list[dict], str]:
    session = create_nse_session()
    equity_names = fetch_equity_names(session)
    offset = 0
    last_error: Exception | None = None

    while offset < MAX_LOOKBACK_DAYS:
        target_date = (start_date or datetime.now().date()) - timedelta(days=offset)
        bhavdate = target_date.strftime("%d%m%Y")
        try:
            rows = fetch_bhavcopy_rows(session, bhavdate, equity_names)
            if not rows:
                raise ValueError(f"No EOD rows found for {bhavdate}.")
            return rows, bhavdate
        except Exception as error:
            last_error = error
            offset += 1

    message = str(last_error) if last_error else "Unknown error"
    raise ValueError(
        f"Unable to fetch NSE EOD data in the last {MAX_LOOKBACK_DAYS} days. {message}"
    )
