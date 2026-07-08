from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.mutual_fund_transaction import MutualFundTransaction
from app.models.ppf_transaction import PpfTransaction
from app.models.stock_transaction import StockTransaction
from app.repositories.mutual_fund_historical_repository import (
    MutualFundHistoricalRepository,
)
from app.repositories.mutual_fund_transaction_repository import (
    MutualFundTransactionRepository,
)
from app.repositories.nse_eod_repository import NseEodRepository
from app.repositories.portfolio_holding_repository import PortfolioHoldingRepository
from app.repositories.ppf_repository import PpfTransactionRepository
from app.repositories.stock_historical_repository import StockHistoricalRepository
from app.repositories.stock_repository import StockRepository
from app.repositories.stock_transaction_repository import StockTransactionRepository
from app.services.amfi_lookup import AmfiFundInfo, fetch_amfi_index, lookup_isin
from app.services.nse_eod_historical_sync_service import NseEodHistoricalSyncService
from app.services.portfolio_holdings_service import PortfolioHoldingsService
from app.services.portfolio_returns_service import PortfolioReturnsService
from app.services.stock_holdings_service import (
    FifoLot as StockFifoLot,
    StockHoldingsService,
    _apply_sell,
    _apply_split,
    _average_cost,
    _decimal,
)
from app.services.stock_returns_service import (
    StockReturnsService,
    resolve_stock_valuation_date,
)
from app.services.stock_trade_types import BUY_LIKE_TRADE_TYPES, SELL_TRADE_TYPES

CHART_START_DATE = date(2022, 1, 1)


@dataclass
class FifoLot:
    units: Decimal
    cost_per_unit: Decimal


@dataclass
class MfHoldingState:
    lots: list[FifoLot] = field(default_factory=list)
    latest_nav: Decimal = Decimal("0")
    scheme_code: Optional[str] = None


@dataclass
class StockHoldingState:
    lots: list[StockFifoLot] = field(default_factory=list)
    latest_price: Decimal = Decimal("0")


@dataclass
class PpfAccountState:
    deposited: Decimal = Decimal("0")
    withdrawn: Decimal = Decimal("0")
    balance: Decimal = Decimal("0")


@dataclass
class InvestmentProgressPoint:
    month: str
    invested_value: float
    current_value: float
    pl: float
    plp: float


class HistoricalPriceLookup:
    def __init__(
        self,
        mf_series: dict[str, list[tuple[date, Decimal]]],
        stock_series: dict[str, list[tuple[date, Decimal]]],
    ) -> None:
        self._mf_series = mf_series
        self._stock_series = stock_series
        self._mf_ptr: dict[str, int] = {}
        self._stock_ptr: dict[str, int] = {}
        self._mf_last: dict[str, Decimal] = {}
        self._stock_last: dict[str, Decimal] = {}

    @classmethod
    def from_repositories(
        cls,
        mf_repository: MutualFundHistoricalRepository,
        stock_repository: StockHistoricalRepository,
        scheme_codes: list[str],
        symbols: list[str],
        to_date: date,
    ) -> HistoricalPriceLookup:
        return cls(
            mf_series=mf_repository.map_nav_series_up_to(scheme_codes, to_date),
            stock_series=stock_repository.map_close_series_up_to(symbols, to_date),
        )

    @classmethod
    def from_series(
        cls,
        mf_series: Optional[dict[str, list[tuple[date, Decimal]]]] = None,
        stock_series: Optional[dict[str, list[tuple[date, Decimal]]]] = None,
    ) -> HistoricalPriceLookup:
        return cls(mf_series=mf_series or {}, stock_series=stock_series or {})

    def mf_nav_on_or_before(
        self,
        scheme_code: str,
        target_date: date,
    ) -> Optional[Decimal]:
        if not scheme_code:
            return None

        series = self._mf_series.get(scheme_code, [])
        ptr = self._mf_ptr.get(scheme_code, 0)
        while ptr < len(series) and series[ptr][0] <= target_date:
            self._mf_last[scheme_code] = series[ptr][1]
            ptr += 1
        self._mf_ptr[scheme_code] = ptr
        return self._mf_last.get(scheme_code)

    def stock_close_on_or_before(
        self,
        symbol: str,
        target_date: date,
    ) -> Optional[Decimal]:
        normalized = symbol.upper()
        series = self._stock_series.get(normalized, [])
        ptr = self._stock_ptr.get(normalized, 0)
        while ptr < len(series) and series[ptr][0] <= target_date:
            self._stock_last[normalized] = series[ptr][1]
            ptr += 1
        self._stock_ptr[normalized] = ptr
        return self._stock_last.get(normalized)


def _month_end(year: int, month: int) -> date:
    return date(year, month, monthrange(year, month)[1])


def _month_key(value: date) -> str:
    return f"{value.year:04d}-{value.month:02d}"


def _iter_month_ends(start_date: date, end_date: date) -> list[date]:
    current = _month_end(start_date.year, start_date.month)
    final = _month_end(end_date.year, end_date.month)
    month_ends: list[date] = []

    while current <= final:
        month_ends.append(current)
        if current.month == 12:
            current = _month_end(current.year + 1, 1)
        else:
            current = _month_end(current.year, current.month + 1)

    return month_ends


def _mf_key(folio: str, isin: str) -> tuple[str, str]:
    # Match portfolio_holdings_service grouping: raw folio + isin.
    return folio, isin.upper().strip()


def _resolve_mf_nav(
    isin: str,
    scheme_code: Optional[str],
    latest_nav: Decimal,
    price_lookup: HistoricalPriceLookup,
    valuation_date: date,
    use_live_nav: bool,
    amfi_index: dict[str, AmfiFundInfo],
) -> Decimal:
    if use_live_nav:
        info = lookup_isin(isin, amfi_index)
        if info and info.nav:
            return _decimal(info.nav)

    if scheme_code:
        nav = price_lookup.mf_nav_on_or_before(scheme_code, valuation_date)
        if nav is not None:
            return nav

    return latest_nav


def _resolve_stock_close(
    symbol: str,
    latest_price: Decimal,
    price_lookup: HistoricalPriceLookup,
    valuation_date: date,
    use_live_price: bool,
    eod_closes: dict[str, Decimal],
) -> Decimal:
    if use_live_price:
        close = eod_closes.get(symbol.upper())
        if close is not None:
            return close

    close = price_lookup.stock_close_on_or_before(symbol, valuation_date)
    if close is not None:
        return close

    return latest_price


def _build_isin_scheme_map(
    mf_transactions: list[MutualFundTransaction],
    amfi_index: dict[str, AmfiFundInfo],
) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for txn in mf_transactions:
        isin = txn.isin.upper().strip()
        if isin in mapping:
            continue
        info = lookup_isin(isin, amfi_index)
        if info and info.scheme_code:
            mapping[isin] = info.scheme_code
    return mapping


def _apply_mf_transaction(
    state: MfHoldingState,
    transaction: MutualFundTransaction,
    isin_scheme_map: dict[str, str],
) -> None:
    state.latest_nav = _decimal(transaction.nav)
    if not state.scheme_code:
        state.scheme_code = isin_scheme_map.get(transaction.isin.upper().strip())

    units = abs(_decimal(transaction.quantity))
    if units == 0:
        return

    if transaction.trade_type == "IN":
        cost_per_unit = abs(_decimal(transaction.trade_value)) / units
        state.lots.append(FifoLot(units=units, cost_per_unit=cost_per_unit))
        return

    if transaction.trade_type != "OUT":
        return

    units_to_redeem = units
    while units_to_redeem > 0 and state.lots:
        lot = state.lots[0]
        if lot.units <= units_to_redeem:
            units_to_redeem -= lot.units
            state.lots.pop(0)
        else:
            lot.units -= units_to_redeem
            units_to_redeem = Decimal("0")


def _apply_stock_transaction(
    state: StockHoldingState,
    transaction: StockTransaction,
) -> None:
    state.latest_price = _decimal(transaction.price)
    quantity = abs(_decimal(transaction.quantity)).quantize(Decimal("1"))
    if quantity == 0:
        return

    if transaction.trade_type in BUY_LIKE_TRADE_TYPES:
        state.lots.append(
            StockFifoLot(quantity=quantity, cost_per_unit=_decimal(transaction.price))
        )
        return

    if transaction.trade_type == "BONUS":
        state.lots.append(StockFifoLot(quantity=quantity, cost_per_unit=Decimal("0")))
        return

    if transaction.trade_type == "SPLIT":
        _apply_split(state.lots, quantity)
        return

    if transaction.trade_type == "DEMERGER":
        cost_per_unit = _decimal(transaction.price)
        if cost_per_unit <= 0 and state.lots:
            cost_per_unit = _average_cost(state.lots)
        state.lots.append(StockFifoLot(quantity=quantity, cost_per_unit=cost_per_unit))
        return

    if transaction.trade_type in SELL_TRADE_TYPES:
        _apply_sell(state.lots, quantity)
        return

    _apply_sell(state.lots, quantity)


def _mf_invested_amount(state: MfHoldingState) -> Decimal:
    return sum((lot.units * lot.cost_per_unit for lot in state.lots), Decimal("0"))


def _mf_total_units(state: MfHoldingState) -> Decimal:
    return sum((lot.units for lot in state.lots), Decimal("0"))


def _stock_invested_amount(state: StockHoldingState) -> Decimal:
    return sum((lot.quantity * lot.cost_per_unit for lot in state.lots), Decimal("0"))


def _stock_total_quantity(state: StockHoldingState) -> Decimal:
    return sum((lot.quantity for lot in state.lots), Decimal("0"))


def _make_point(
    month_end: date,
    invested_value: Decimal,
    current_value: Decimal,
) -> InvestmentProgressPoint:
    invested_value = invested_value.quantize(Decimal("0.01"))
    current_value = current_value.quantize(Decimal("0.01"))
    if invested_value <= 0 and current_value <= 0:
        pl = Decimal("0")
        plp = Decimal("0")
    else:
        pl = (current_value - invested_value).quantize(Decimal("0.01"))
        plp = (
            (pl / invested_value * Decimal("100")).quantize(Decimal("0.01"))
            if invested_value > 0
            else Decimal("0")
        )

    return InvestmentProgressPoint(
        month=_month_key(month_end),
        invested_value=float(invested_value),
        current_value=float(current_value),
        pl=float(pl),
        plp=float(plp),
    )


def compute_investment_progress(
    mf_transactions: list[MutualFundTransaction],
    stock_transactions: list[StockTransaction],
    ppf_transactions: list[PpfTransaction],
    price_lookup: HistoricalPriceLookup,
    isin_scheme_map: dict[str, str],
    amfi_index: Optional[dict[str, AmfiFundInfo]] = None,
    eod_closes: Optional[dict[str, Decimal]] = None,
    end_date: Optional[date] = None,
) -> dict[str, list[InvestmentProgressPoint]]:
    if not mf_transactions and not stock_transactions and not ppf_transactions:
        return {"mf": [], "stocks": [], "ppf": []}

    start_candidates = [
        txn.transaction_date
        for txn in (
            *mf_transactions,
            *stock_transactions,
            *ppf_transactions,
        )
    ]
    start_date = max(min(start_candidates), CHART_START_DATE)
    valuation_end = end_date or date.today()
    amfi_index = amfi_index or {}
    eod_closes = eod_closes or {}
    use_live_prices_for_current = end_date is None

    mf_states: dict[tuple[str, str], MfHoldingState] = {}
    stock_states: dict[str, StockHoldingState] = {}
    ppf_states: dict[str, PpfAccountState] = {}

    mf_index = 0
    stock_index = 0
    ppf_index = 0

    mf_points: list[InvestmentProgressPoint] = []
    stock_points: list[InvestmentProgressPoint] = []
    ppf_points: list[InvestmentProgressPoint] = []
    has_mf = bool(mf_transactions)
    has_stocks = bool(stock_transactions)
    has_ppf = bool(ppf_transactions)

    for month_end in _iter_month_ends(start_date, valuation_end):
        valuation_date = min(month_end, valuation_end)
        use_live_price = use_live_prices_for_current and valuation_date == valuation_end

        while mf_index < len(mf_transactions) and (
            mf_transactions[mf_index].transaction_date <= month_end
        ):
            txn = mf_transactions[mf_index]
            key = _mf_key(txn.folio, txn.isin)
            state = mf_states.setdefault(key, MfHoldingState())
            _apply_mf_transaction(state, txn, isin_scheme_map)
            mf_index += 1

        while stock_index < len(stock_transactions) and (
            stock_transactions[stock_index].transaction_date <= month_end
        ):
            txn = stock_transactions[stock_index]
            symbol = txn.symbol.upper()
            state = stock_states.setdefault(symbol, StockHoldingState())
            _apply_stock_transaction(state, txn)
            stock_index += 1

        while ppf_index < len(ppf_transactions) and (
            ppf_transactions[ppf_index].transaction_date <= month_end
        ):
            txn = ppf_transactions[ppf_index]
            account = txn.account_number
            state = ppf_states.setdefault(account, PpfAccountState())
            state.deposited += _decimal(txn.deposit_amount)
            state.withdrawn += _decimal(txn.withdrawal_amount)
            state.balance = _decimal(txn.balance)
            ppf_index += 1

        active_mf = {
            key: state
            for key, state in mf_states.items()
            if _mf_total_units(state) > 0
        }
        active_stocks = {
            symbol: state
            for symbol, state in stock_states.items()
            if _stock_total_quantity(state) > 0
        }

        mf_invested = Decimal("0")
        mf_current = Decimal("0")
        for (_folio, isin), state in active_mf.items():
            units = _mf_total_units(state)
            invested = _mf_invested_amount(state)
            nav = _resolve_mf_nav(
                isin,
                state.scheme_code,
                state.latest_nav,
                price_lookup,
                valuation_date,
                use_live_price,
                amfi_index,
            )
            current = (units * nav).quantize(Decimal("0.01"))
            mf_invested += invested
            mf_current += current

        stock_invested = Decimal("0")
        stock_current = Decimal("0")
        for symbol, state in active_stocks.items():
            quantity = _stock_total_quantity(state)
            invested = _stock_invested_amount(state)
            close = _resolve_stock_close(
                symbol,
                state.latest_price,
                price_lookup,
                valuation_date,
                use_live_price,
                eod_closes,
            )
            current = (quantity * close).quantize(Decimal("0.01"))
            stock_invested += invested
            stock_current += current

        ppf_invested = Decimal("0")
        ppf_current = Decimal("0")
        for state in ppf_states.values():
            ppf_invested += state.deposited - state.withdrawn
            ppf_current += state.balance

        for bucket, invested, current, enabled in (
            (mf_points, mf_invested, mf_current, has_mf),
            (stock_points, stock_invested, stock_current, has_stocks),
            (ppf_points, ppf_invested, ppf_current, has_ppf),
        ):
            if enabled:
                bucket.append(_make_point(month_end, invested, current))

    return {
        "mf": mf_points,
        "stocks": stock_points,
        "ppf": ppf_points,
    }


class InvestmentProgressService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.mf_transaction_repository = MutualFundTransactionRepository(db)
        self.stock_transaction_repository = StockTransactionRepository(db)
        self.ppf_transaction_repository = PpfTransactionRepository(db)
        self.mf_historical_repository = MutualFundHistoricalRepository(db)
        self.stock_historical_repository = StockHistoricalRepository(db)
        self.holding_repository = PortfolioHoldingRepository(db)
        self.stock_repository = StockRepository(db)
        self.nse_eod_repository = NseEodRepository(db)
        self.mf_returns_service = PortfolioReturnsService()
        self.stock_returns_service = StockReturnsService()
        self.mf_holdings_service = PortfolioHoldingsService(
            self.mf_transaction_repository,
            self.holding_repository,
        )
        self.stock_holdings_service = StockHoldingsService(
            self.stock_transaction_repository,
            self.stock_repository,
            self.nse_eod_repository,
        )

    def _align_current_mf_point(
        self,
        mf_points: list[InvestmentProgressPoint],
        client_pan: str,
        mf_transactions: list[MutualFundTransaction],
    ) -> None:
        if not mf_points:
            return

        today = date.today()
        current_month = _month_key(_month_end(today.year, today.month))
        if mf_points[-1].month != current_month:
            return

        records = self.holding_repository.list_by_client_pan(client_pan)
        if not records and mf_transactions:
            self.mf_holdings_service.recalculate_for_client(client_pan)
            records = self.holding_repository.list_by_client_pan(client_pan)
        if not records:
            return

        rows = self.mf_returns_service.enrich_holdings(records, mf_transactions)
        invested = Decimal(str(round(sum(row.invested_amount for row in rows), 2)))
        current = Decimal(str(round(sum(row.current_value for row in rows), 2)))
        point = _make_point(_month_end(today.year, today.month), invested, current)
        mf_points[-1] = point

    def _align_current_stocks_point(
        self,
        stock_points: list[InvestmentProgressPoint],
        client_pan: str,
        stock_transactions: list[StockTransaction],
    ) -> None:
        if not stock_points:
            return

        today = date.today()
        current_month = _month_key(_month_end(today.year, today.month))
        if stock_points[-1].month != current_month:
            return

        records = self.stock_repository.list_by_client_pan(client_pan)
        if not records and stock_transactions:
            self.stock_holdings_service.recalculate_for_client(client_pan)
            records = self.stock_repository.list_by_client_pan(client_pan)
        if not records:
            return

        eod_map = self.nse_eod_repository.map_by_symbols(
            [record.symbol for record in records]
        )
        valuation_date = (
            resolve_stock_valuation_date(eod_map) if eod_map else today
        )
        rows = self.stock_returns_service.enrich_holdings(
            records=records,
            transactions=stock_transactions,
            eod_map=eod_map,
            valuation_date=valuation_date,
        )
        invested = Decimal(str(round(sum(row.invested_amount for row in rows), 2)))
        current = Decimal(str(round(sum(row.current_value for row in rows), 2)))
        point = _make_point(_month_end(today.year, today.month), invested, current)
        stock_points[-1] = point

    def _ensure_stock_history(
        self,
        stock_transactions: list[StockTransaction],
        valuation_end: date,
    ) -> None:
        if not stock_transactions:
            return

        symbols = {txn.symbol.upper() for txn in stock_transactions}
        missing = [
            symbol
            for symbol in symbols
            if self.stock_historical_repository.get_earliest_date(symbol) is None
        ]
        if not missing:
            return

        start_date = max(
            min(
                txn.transaction_date
                for txn in stock_transactions
                if txn.symbol.upper() in missing
            ),
            CHART_START_DATE,
        )
        NseEodHistoricalSyncService(self.db).ensure_history(
            set(missing),
            start_date,
            valuation_end,
        )

    def build_progress(self, client_pan: str) -> dict[str, list[InvestmentProgressPoint]]:
        mf_transactions = (
            self.mf_transaction_repository.list_by_client_pan_chronological(
                client_pan
            )
        )
        stock_transactions = (
            self.stock_transaction_repository.list_by_client_pan_chronological(
                client_pan
            )
        )
        ppf_transactions = sorted(
            self.ppf_transaction_repository.list_by_client_pan(client_pan),
            key=lambda txn: (txn.transaction_date, txn.id),
        )

        valuation_end = date.today()
        amfi_index = fetch_amfi_index()
        isin_scheme_map: dict[str, str] = {}
        if mf_transactions:
            isin_scheme_map = _build_isin_scheme_map(
                mf_transactions,
                amfi_index,
            )

        scheme_codes = list(set(isin_scheme_map.values()))
        symbols = list({txn.symbol.upper() for txn in stock_transactions})
        self._ensure_stock_history(stock_transactions, valuation_end)
        eod_map = self.nse_eod_repository.map_by_symbols(symbols)
        eod_closes = {
            symbol: _decimal(record.close) for symbol, record in eod_map.items()
        }
        price_lookup = HistoricalPriceLookup.from_repositories(
            self.mf_historical_repository,
            self.stock_historical_repository,
            scheme_codes,
            symbols,
            valuation_end,
        )

        progress = compute_investment_progress(
            mf_transactions=mf_transactions,
            stock_transactions=stock_transactions,
            ppf_transactions=ppf_transactions,
            price_lookup=price_lookup,
            isin_scheme_map=isin_scheme_map,
            amfi_index=amfi_index,
            eod_closes=eod_closes,
        )
        self._align_current_mf_point(progress["mf"], client_pan, mf_transactions)
        self._align_current_stocks_point(
            progress["stocks"],
            client_pan,
            stock_transactions,
        )
        return progress
