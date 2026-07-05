import { useEffect, useMemo, useState } from 'react'
import BootstrapIcon from '../icons/BootstrapIcon'
import {
  collectFinancialYears,
  formatFinancialYearLabel,
  getCurrentIndianFinancialYear,
  getIndianFinancialYear,
} from '../../utils/financialYear'
import { formatGainAmount, formatHoldingPeriod } from '../../utils/capitalGainsFormat'
import {
  formatNav,
  formatQuantity,
  formatTradeValue,
  formatTransactionDate,
} from '../../utils/mutualFundFormat'
import { formatStockQuantity } from '../../utils/stockFormat'

function gainClassName(value) {
  if (value > 0) return 'mf-gain-positive'
  if (value < 0) return 'mf-gain-negative'
  return 'mf-gain-neutral'
}

function formatRowQuantity(row) {
  if (row.asset_type === 'stock') {
    return formatStockQuantity(row.quantity)
  }

  return formatQuantity(row.quantity)
}

function formatSellRate(row) {
  if (row.asset_type === 'mutual-fund') {
    return formatNav(row.sell_rate)
  }

  return formatTradeValue(row.sell_rate)
}

function formatBuyRate(row) {
  if (row.asset_type === 'mutual-fund') {
    return formatNav(row.buy_rate)
  }

  return formatTradeValue(row.buy_rate)
}

function formatAccountRef(row) {
  if (row.asset_type === 'mutual-fund') {
    return row.folio ?? '—'
  }

  return row.broker ?? '—'
}

function hasTermGain(value) {
  if (value == null || value === '') {
    return false
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed !== 0
}

function TermGainCell({ gain, holdingPeriodDays }) {
  const showHoldingPeriod = hasTermGain(gain) && holdingPeriodDays != null

  return (
    <td className={`mf-table-cell-right tabular-nums ${gainClassName(gain)}`}>
      <div>{formatGainAmount(gain)}</div>
      {showHoldingPeriod && (
        <span className="mf-fund-meta">({formatHoldingPeriod(holdingPeriodDays)})</span>
      )}
    </td>
  )
}

function RealizedSellTransactionsTable({ transactions }) {
  const [query, setQuery] = useState('')
  const [assetFilter, setAssetFilter] = useState('all')
  const [financialYearFilter, setFinancialYearFilter] = useState(() =>
    getCurrentIndianFinancialYear(),
  )

  const assetScopedTransactions = useMemo(() => {
    if (assetFilter === 'all') {
      return transactions
    }

    return transactions.filter((row) => row.asset_type === assetFilter)
  }, [transactions, assetFilter])

  const financialYears = useMemo(
    () => collectFinancialYears(assetScopedTransactions),
    [assetScopedTransactions],
  )

  const financialYearCounts = useMemo(() => {
    const counts = { all: assetScopedTransactions.length }

    for (const row of assetScopedTransactions) {
      const fy = getIndianFinancialYear(row.transaction_date)
      if (fy) {
        counts[fy] = (counts[fy] ?? 0) + 1
      }
    }

    return counts
  }, [assetScopedTransactions])

  useEffect(() => {
    if (financialYearFilter === 'all') {
      return
    }

    if (!financialYears.includes(financialYearFilter)) {
      const currentFy = getCurrentIndianFinancialYear()
      setFinancialYearFilter(financialYears.includes(currentFy) ? currentFy : 'all')
    }
  }, [assetFilter, financialYears, financialYearFilter])

  const stockCount = useMemo(
    () => transactions.filter((row) => row.asset_type === 'stock').length,
    [transactions],
  )
  const mutualFundCount = transactions.length - stockCount

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return transactions.filter((row) => {
      if (assetFilter !== 'all' && row.asset_type !== assetFilter) {
        return false
      }

      if (
        financialYearFilter !== 'all' &&
        getIndianFinancialYear(row.transaction_date) !== financialYearFilter
      ) {
        return false
      }

      if (!normalized) {
        return true
      }

      return (
        row.label?.toLowerCase().includes(normalized) ||
        row.folio?.toLowerCase().includes(normalized) ||
        row.broker?.toLowerCase().includes(normalized) ||
        row.meta?.toLowerCase().includes(normalized)
      )
    })
  }, [transactions, query, assetFilter, financialYearFilter])

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, row) => {
        acc.quantity += row.quantity
        acc.trade_value += row.trade_value
        acc.purchase_value += row.purchase_value
        acc.short_term_gain += row.short_term_gain ?? 0
        acc.long_term_gain += row.long_term_gain ?? 0
        return acc
      },
      {
        quantity: 0,
        trade_value: 0,
        purchase_value: 0,
        short_term_gain: 0,
        long_term_gain: 0,
      },
    )
  }, [filtered])

  const hasActiveFilters =
    query.trim() ||
    assetFilter !== 'all' ||
    financialYearFilter !== getCurrentIndianFinancialYear()

  if (!transactions?.length) {
    return (
      <div className="mf-empty-state">
        <div className="mf-empty-state-icon" aria-hidden="true">
          <BootstrapIcon icon="bi-receipt-cutoff" />
        </div>
        <h2 className="mf-empty-state-title">No sell transactions yet</h2>
        <p className="mf-empty-state-text">
          Realized gains appear when you sell stocks or redeem mutual fund units.
        </p>
      </div>
    )
  }

  return (
    <div className="mf-txn-panel cg-realized-panel">
      <div className="cg-realized-toolbar">
        <div className="mf-txn-search-wrap cg-realized-search">
          <BootstrapIcon icon="bi-search" className="mf-txn-search-icon" />
          <input
            type="search"
            className="mf-txn-search"
            placeholder="Search symbol, folio, broker, ISIN…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="cg-filter-groups">
          <div className="mf-txn-filters" role="group" aria-label="Asset type">
            <button
              type="button"
              className={`mf-txn-filter-btn${assetFilter === 'all' ? ' mf-txn-filter-btn-active' : ''}`}
              onClick={() => setAssetFilter('all')}
            >
              All ({transactions.length})
            </button>
            <button
              type="button"
              className={`mf-txn-filter-btn${assetFilter === 'stock' ? ' mf-txn-filter-btn-active' : ''}`}
              onClick={() => setAssetFilter('stock')}
            >
              Stocks ({stockCount})
            </button>
            <button
              type="button"
              className={`mf-txn-filter-btn${assetFilter === 'mutual-fund' ? ' mf-txn-filter-btn-active' : ''}`}
              onClick={() => setAssetFilter('mutual-fund')}
            >
              Mutual fund ({mutualFundCount})
            </button>
          </div>

          <div className="mf-txn-filters" role="group" aria-label="Financial year">
            <button
              type="button"
              className={`mf-txn-filter-btn${financialYearFilter === 'all' ? ' mf-txn-filter-btn-active' : ''}`}
              onClick={() => setFinancialYearFilter('all')}
            >
              {formatFinancialYearLabel('all')} ({financialYearCounts.all ?? 0})
            </button>
            {financialYears.map((fy) => (
              <button
                key={fy}
                type="button"
                className={`mf-txn-filter-btn${financialYearFilter === fy ? ' mf-txn-filter-btn-active' : ''}`}
                onClick={() => setFinancialYearFilter(fy)}
              >
                {formatFinancialYearLabel(fy)} ({financialYearCounts[fy] ?? 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mf-table-summary">
        {filtered.length} sell transaction{filtered.length === 1 ? '' : 's'}
        {hasActiveFilters && filtered.length !== transactions.length && (
          <> (filtered from {transactions.length})</>
        )}
      </div>

      <div className="cg-table-viewport">
        <table className="mf-table mf-txn-table cg-gains-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Folio / Broker</th>
              <th className="mf-table-cell-right">Qty</th>
              <th className="mf-table-cell-right">Sale value</th>
              <th className="mf-table-cell-right">Purchase value</th>
              <th className="mf-table-cell-right">STCG</th>
              <th className="mf-table-cell-right">LTCG</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="mf-txn-empty">
                  No sell transactions match your filters.
                </td>
              </tr>
            ) : (
              <>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="tabular-nums">{formatTransactionDate(row.transaction_date)}</td>
                    <td>
                      {row.asset_type === 'mutual-fund' ? (
                        <div className="mf-fund-cell">
                          <span className="mf-fund-name mf-fund-name-sm" title={row.label}>
                            {row.label}
                          </span>
                          {row.meta && <span className="mf-fund-meta">{row.meta}</span>}
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-slate-100">{row.label}</span>
                          {row.meta && <span className="mf-fund-meta ml-1.5">{row.meta}</span>}
                        </>
                      )}
                    </td>
                    <td className="tabular-nums">{formatAccountRef(row)}</td>
                    <td className="mf-table-cell-right tabular-nums">
                      {formatRowQuantity(row)}
                    </td>
                    <td className="mf-table-cell-right tabular-nums">
                      <div>{formatTradeValue(row.trade_value)}</div>
                      <span className="mf-fund-meta">({formatSellRate(row)})</span>
                    </td>
                    <td className="mf-table-cell-right tabular-nums">
                      <div>{formatTradeValue(row.purchase_value)}</div>
                      <span className="mf-fund-meta">({formatBuyRate(row)})</span>
                    </td>
                    <TermGainCell
                      gain={row.short_term_gain}
                      holdingPeriodDays={row.short_term_holding_period_days}
                    />
                    <TermGainCell
                      gain={row.long_term_gain}
                      holdingPeriodDays={row.long_term_holding_period_days}
                    />
                  </tr>
                ))}
                <tr className="mf-table-total-row">
                  <td colSpan={3}>
                    <span className="mf-table-total-label">Total</span>
                  </td>
                  <td className="mf-table-cell-right tabular-nums">
                    {assetFilter === 'all'
                      ? '—'
                      : assetFilter === 'stock'
                        ? formatStockQuantity(totals.quantity)
                        : formatQuantity(totals.quantity)}
                  </td>
                  <td className="mf-table-cell-right tabular-nums">
                    {formatTradeValue(totals.trade_value)}
                  </td>
                  <td className="mf-table-cell-right tabular-nums">
                    {formatTradeValue(totals.purchase_value)}
                  </td>
                  <td className={`mf-table-cell-right tabular-nums ${gainClassName(totals.short_term_gain)}`}>
                    {formatGainAmount(totals.short_term_gain)}
                  </td>
                  <td className={`mf-table-cell-right tabular-nums ${gainClassName(totals.long_term_gain)}`}>
                    {formatGainAmount(totals.long_term_gain)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RealizedSellTransactionsTable
