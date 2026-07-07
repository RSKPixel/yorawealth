import { useEffect, useMemo, useState } from 'react'
import BootstrapIcon from '../icons/BootstrapIcon'
import {
  collectFinancialYears,
  formatFinancialYearLabel,
  getCurrentIndianFinancialYear,
  getIndianFinancialYear,
} from '../../utils/financialYear'
import { formatGainAmount } from '../../utils/capitalGainsFormat'
import { formatTransactionDate } from '../../utils/mutualFundFormat'
import { SALE_REASON_MAX_LENGTH } from '../../utils/capitalGainValidation'

function gainClassName(value) {
  if (value > 0) return 'mf-gain-positive'
  if (value < 0) return 'mf-gain-negative'
  return 'mf-gain-neutral'
}

function TermGainCell({ gain }) {
  return (
    <td className={`mf-table-cell-right tabular-nums ${gainClassName(gain)}`}>
      {formatGainAmount(gain)}
    </td>
  )
}

function SaleReasonEditor({
  row,
  value,
  onChange,
  onSave,
  isSaving,
  disabled,
}) {
  const savedValue = row.sale_reason ?? ''
  const isDirty = value.trim() !== savedValue.trim()
  const isTooLong = value.length > SALE_REASON_MAX_LENGTH
  const canSave = isDirty && !isTooLong && !isSaving && !disabled

  return (
    <div
      className="cg-sale-reason-editor"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <input
        type="text"
        className="cg-sale-reason-input"
        value={value}
        maxLength={SALE_REASON_MAX_LENGTH}
        placeholder="Reason for Sale"
        onChange={(event) => onChange(row.id, event.target.value)}
        disabled={disabled || isSaving}
        aria-label={`Reason for sale for ${row.label}`}
      />
      <button
        type="button"
        className="cg-sale-reason-save-btn stocks-txn-action-btn"
        onClick={() => onSave(row)}
        disabled={!canSave}
        aria-label={`Save reason for sale for ${row.label}`}
      >
        <BootstrapIcon
          icon={isSaving ? 'bi-arrow-repeat' : 'bi-check-lg'}
          className={isSaving ? 'animate-spin' : undefined}
        />
      </button>
    </div>
  )
}

function RealizedSellTransactionsTable({
  transactions,
  onRowClick,
  onSaveSaleReason,
  isMutating = false,
  savingSaleReasonRowId = null,
}) {
  const [query, setQuery] = useState('')
  const [assetFilter, setAssetFilter] = useState('all')
  const [financialYearFilter, setFinancialYearFilter] = useState(() =>
    getCurrentIndianFinancialYear(),
  )
  const [saleReasonDrafts, setSaleReasonDrafts] = useState({})

  useEffect(() => {
    const next = {}
    for (const row of transactions) {
      next[row.id] = row.sale_reason ?? ''
    }
    setSaleReasonDrafts(next)
  }, [transactions])

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
        acc.short_term_gain += row.short_term_gain ?? 0
        acc.long_term_gain += row.long_term_gain ?? 0
        return acc
      },
      {
        short_term_gain: 0,
        long_term_gain: 0,
      },
    )
  }, [filtered])

  const updateSaleReasonDraft = (rowId, value) => {
    setSaleReasonDrafts((current) => ({ ...current, [rowId]: value }))
  }

  const hasActiveFilters =
    query.trim() ||
    assetFilter !== 'all' ||
    financialYearFilter !== getCurrentIndianFinancialYear()

  const columnCount = 5

  const handleRowActivate = (row) => {
    onRowClick?.(row)
  }

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
            placeholder="Search symbol, broker, ISIN…"
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
              <th>Symbol / Fund</th>
              <th className="mf-table-cell-right">STCG</th>
              <th className="mf-table-cell-right">LTCG</th>
              <th>Reason for Sale</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="mf-txn-empty">
                  No sell transactions match your filters.
                </td>
              </tr>
            ) : (
              <>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="cg-gains-row"
                    onClick={() => handleRowActivate(row)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleRowActivate(row)
                      }
                    }}
                    tabIndex={0}
                    aria-label={`View details for ${row.label}`}
                  >
                    <td className="tabular-nums">{formatTransactionDate(row.transaction_date)}</td>
                    <td className="cg-symbol-cell">
                      {row.asset_type === 'mutual-fund' ? (
                        <span className="mf-fund-name mf-fund-name-sm" title={row.label}>
                          {row.label}
                        </span>
                      ) : (
                        <span className="font-medium text-slate-100">{row.label}</span>
                      )}
                    </td>
                    <TermGainCell gain={row.short_term_gain} />
                    <TermGainCell gain={row.long_term_gain} />
                    <td className="cg-sale-reason-cell">
                      <SaleReasonEditor
                        row={row}
                        value={saleReasonDrafts[row.id] ?? ''}
                        onChange={updateSaleReasonDraft}
                        onSave={(targetRow) => {
                          const trimmed = (saleReasonDrafts[targetRow.id] ?? '').trim()
                          onSaveSaleReason?.(targetRow, trimmed || null)
                        }}
                        isSaving={savingSaleReasonRowId === row.id}
                        disabled={isMutating && savingSaleReasonRowId !== row.id}
                      />
                    </td>
                  </tr>
                ))}
                <tr className="mf-table-total-row">
                  <td colSpan={2}>
                    <span className="mf-table-total-label">Total</span>
                  </td>
                  <td className={`mf-table-cell-right tabular-nums ${gainClassName(totals.short_term_gain)}`}>
                    {formatGainAmount(totals.short_term_gain)}
                  </td>
                  <td className={`mf-table-cell-right tabular-nums ${gainClassName(totals.long_term_gain)}`}>
                    {formatGainAmount(totals.long_term_gain)}
                  </td>
                  <td />
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
