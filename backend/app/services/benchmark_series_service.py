from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Callable, Optional

from app.repositories.index_historical_repository import IndexHistoricalRepository
from app.repositories.mutual_fund_historical_repository import (
    MutualFundHistoricalRepository,
)
from app.repositories.stock_historical_repository import StockHistoricalRepository
from app.services.amfi_lookup import AmfiFundInfo, lookup_isin
from app.services.investment_progress_service import (
    CHART_START_DATE,
    IndexBenchmarkPoint,
    _iter_month_ends,
    _month_key,
)

PRESET_ETF_BENCHMARKS = (
    ("NIFTYBEES", "NIFTYBEES"),
    ("GOLDBEES", "GOLDBEES"),
)


@dataclass
class BenchmarkSeries:
    id: str
    label: str
    points: list[IndexBenchmarkPoint]


def build_month_end_price_series_from_rows(
    price_series: list[tuple[date, Decimal]],
    to_date: date,
    *,
    start_date: date = CHART_START_DATE,
) -> list[IndexBenchmarkPoint]:
    month_ends = _iter_month_ends(start_date, to_date)
    points: list[IndexBenchmarkPoint] = []
    last_close: Optional[Decimal] = None
    ptr = 0

    for month_end in month_ends:
        while ptr < len(price_series) and price_series[ptr][0] <= month_end:
            last_close = price_series[ptr][1]
            ptr += 1
        if last_close is None:
            continue

        points.append(
            IndexBenchmarkPoint(
                month=_month_key(month_end),
                close=float(last_close.quantize(Decimal("0.01"))),
            )
        )

    return points


def build_month_end_price_series(
    to_date: date,
    get_close_on_or_before: Callable[[date], Optional[Decimal]],
    *,
    start_date: date = CHART_START_DATE,
) -> list[IndexBenchmarkPoint]:
    month_ends = _iter_month_ends(start_date, to_date)
    points: list[IndexBenchmarkPoint] = []
    last_close: Optional[Decimal] = None

    for month_end in month_ends:
        close = get_close_on_or_before(month_end)
        if close is not None:
            last_close = close
        if last_close is None:
            continue

        points.append(
            IndexBenchmarkPoint(
                month=_month_key(month_end),
                close=float(last_close.quantize(Decimal("0.01"))),
            )
        )

    return points


def build_index_benchmark_series(
    repository: IndexHistoricalRepository,
    symbol: str,
    to_date: date,
) -> list[IndexBenchmarkPoint]:
    rows = repository.list_by_symbol(symbol, CHART_START_DATE, to_date)
    series = [(row.trade_date, row.close) for row in rows]
    return build_month_end_price_series_from_rows(series, to_date)


def build_stock_benchmark_series(
    repository: StockHistoricalRepository,
    symbol: str,
    to_date: date,
) -> list[IndexBenchmarkPoint]:
    normalized = symbol.upper()
    series = repository.map_close_series_up_to([normalized], to_date).get(normalized, [])
    return build_month_end_price_series_from_rows(series, to_date)


def build_mf_benchmark_series(
    repository: MutualFundHistoricalRepository,
    scheme_code: str,
    to_date: date,
    *,
    nav_series: Optional[list[tuple[date, Decimal]]] = None,
) -> list[IndexBenchmarkPoint]:
    series = nav_series
    if series is None:
        series = repository.map_nav_series_up_to([scheme_code], to_date).get(
            scheme_code,
            [],
        )
    return build_month_end_price_series_from_rows(series, to_date)


def build_portfolio_benchmark_series(
    *,
    stock_repository: StockHistoricalRepository,
    mf_repository: MutualFundHistoricalRepository,
    holdings: list,
    amfi_index: dict[str, AmfiFundInfo],
    isin_scheme_map: dict[str, str],
    to_date: date,
) -> list[BenchmarkSeries]:
    benchmarks: list[BenchmarkSeries] = []

    for symbol, label in PRESET_ETF_BENCHMARKS:
        points = build_stock_benchmark_series(stock_repository, symbol, to_date)
        if points:
            benchmarks.append(BenchmarkSeries(id=symbol, label=label, points=points))

    seen_isins: set[str] = set()
    sorted_holdings = sorted(
        holdings,
        key=lambda holding: (holding.fund_name or "", holding.isin),
    )
    mf_scheme_codes: list[str] = []
    holding_scheme_pairs: list[tuple] = []
    for holding in sorted_holdings:
        isin = holding.isin.upper().strip()
        if not isin or isin in seen_isins:
            continue
        seen_isins.add(isin)

        scheme_code = isin_scheme_map.get(isin)
        if not scheme_code:
            info = lookup_isin(isin, amfi_index)
            scheme_code = info.scheme_code if info else None
        if not scheme_code:
            continue

        mf_scheme_codes.append(scheme_code)
        holding_scheme_pairs.append((holding, scheme_code))

    mf_nav_series = mf_repository.map_nav_series_up_to(mf_scheme_codes, to_date)

    for holding, scheme_code in holding_scheme_pairs:
        points = build_mf_benchmark_series(
            mf_repository,
            scheme_code,
            to_date,
            nav_series=mf_nav_series.get(scheme_code, []),
        )
        if not points:
            continue

        isin = holding.isin.upper().strip()
        label = (holding.fund_name or isin).strip()
        benchmarks.append(
            BenchmarkSeries(
                id=f"mf:{isin}",
                label=label,
                points=points,
            )
        )

    return benchmarks
