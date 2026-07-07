import { useEffect, useMemo, useState } from 'react'
import BootstrapIcon from '../icons/BootstrapIcon'
import {
  collectFinancialYears,
  collectMonthsInFinancialYear,
  formatFinancialYearLabel,
  formatMonthLabel,
  getCurrentIndianFinancialYear,
  getIndianFinancialYear,
  getTransactionMonthKey,
} from '../../utils/financialYear'
import { formatTradeValue, formatTransactionDate } from '../../utils/mutualFundFormat'

const PAGE_SIZE = 50

function matchesAmountSearch(row, query) {
  const amountQuery = query.replace(/[₹,\s]/g, '')
  if (!amountQuery || !/\d/.test(amountQuery)) {
    return false
  }

  for (const field of [row.debit, row.credit]) {
    const amount = Number(field)
    if (!amount || Number.isNaN(amount)) {
      continue
    }

    const candidates = [
      String(amount),
      amount.toFixed(2),
      formatTradeValue(amount).toLowerCase().replace(/[₹,\s]/g, ''),
    ]

    if (candidates.some((value) => value.includes(amountQuery))) {
      return true
    }
  }

  return false
}

function BankTransactionsTable({ transactions }) {
  const [query, setQuery] = useState('')
  const [financialYearFilter, setFinancialYearFilter] = useState(() =>
    getCurrentIndianFinancialYear(),
  )
  const [monthFilter, setMonthFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const financialYears = useMemo(
    () => collectFinancialYears(transactions),
    [transactions],
  )

  const financialYearCounts = useMemo(() => {
    const counts = { all: transactions.length }

    for (const row of transactions) {
      const fy = getIndianFinancialYear(row.transaction_date)
      if (fy) {
        counts[fy] = (counts[fy] ?? 0) + 1
      }
    }

    return counts
  }, [transactions])

  const monthsInYear = useMemo(
    () => collectMonthsInFinancialYear(transactions, financialYearFilter),
    [transactions, financialYearFilter],
  )

  const monthCounts = useMemo(() => {
    const counts = { all: 0 }

    for (const row of transactions) {
      if (
        financialYearFilter !== 'all' &&
        getIndianFinancialYear(row.transaction_date) !== financialYearFilter
      ) {
        continue
      }

      counts.all += 1
      const monthKey = getTransactionMonthKey(row.transaction_date)
      if (monthKey) {
        counts[monthKey] = (counts[monthKey] ?? 0) + 1
      }
    }

    return counts
  }, [transactions, financialYearFilter])

  useEffect(() => {
    if (financialYearFilter === 'all') {
      setMonthFilter('all')
      return
    }

    if (!financialYears.includes(financialYearFilter)) {
      const currentFy = getCurrentIndianFinancialYear()
      setFinancialYearFilter(financialYears.includes(currentFy) ? currentFy : 'all')
      setMonthFilter('all')
    }
  }, [financialYears, financialYearFilter])

  useEffect(() => {
    if (monthFilter === 'all') {
      return
    }

    if (!monthsInYear.includes(monthFilter)) {
      setMonthFilter('all')
    }
  }, [monthFilter, monthsInYear])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return transactions.filter((row) => {
      if (
        financialYearFilter !== 'all' &&
        getIndianFinancialYear(row.transaction_date) !== financialYearFilter
      ) {
        return false
      }

      if (monthFilter !== 'all') {
        const monthKey = getTransactionMonthKey(row.transaction_date)
        if (monthKey !== monthFilter) {
          return false
        }
      }

      if (!normalized) {
        return true
      }

      return (
        row.account_number?.toLowerCase().includes(normalized) ||
        row.description?.toLowerCase().includes(normalized) ||
        row.reference?.toLowerCase().includes(normalized) ||
        matchesAmountSearch(row, normalized)
      )
    })
  }, [transactions, query, financialYearFilter, monthFilter])

  const resetVisibleCount = () => setVisibleCount(PAGE_SIZE)

  if (!transactions?.length) {
    return null
  }

  const visible = filtered.slice(0, visibleCount)
  const hasActiveFilters =
    query.trim() ||
    financialYearFilter !== getCurrentIndianFinancialYear() ||
    monthFilter !== 'all'

  return (
    <div className="mf-txn-panel">
      <div className="bank-txn-toolbar">
        <div className="mf-txn-search-wrap">
          <BootstrapIcon icon="bi-search" className="mf-txn-search-icon" />
          <input
            type="search"
            className="mf-txn-search"
            placeholder="Search description, reference, account, amount…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              resetVisibleCount()
            }}
          />
        </div>

        <div className="cg-filter-groups">
          <div className="mf-txn-filters" role="group" aria-label="Financial year">
            <button
              type="button"
              className={`mf-txn-filter-btn${financialYearFilter === 'all' ? ' mf-txn-filter-btn-active' : ''}`}
              onClick={() => {
                setFinancialYearFilter('all')
                setMonthFilter('all')
                resetVisibleCount()
              }}
            >
              {formatFinancialYearLabel('all')} ({financialYearCounts.all ?? 0})
            </button>
            {financialYears.map((fy) => (
              <button
                key={fy}
                type="button"
                className={`mf-txn-filter-btn${financialYearFilter === fy ? ' mf-txn-filter-btn-active' : ''}`}
                onClick={() => {
                  setFinancialYearFilter(fy)
                  setMonthFilter('all')
                  resetVisibleCount()
                }}
              >
                {formatFinancialYearLabel(fy)} ({financialYearCounts[fy] ?? 0})
              </button>
            ))}
          </div>

          {financialYearFilter !== 'all' && monthsInYear.length > 0 && (
            <div className="mf-txn-filters" role="group" aria-label="Month">
              <button
                type="button"
                className={`mf-txn-filter-btn${monthFilter === 'all' ? ' mf-txn-filter-btn-active' : ''}`}
                onClick={() => {
                  setMonthFilter('all')
                  resetVisibleCount()
                }}
              >
                {formatMonthLabel('all')} ({monthCounts.all ?? 0})
              </button>
              {monthsInYear.map((monthKey) => (
                <button
                  key={monthKey}
                  type="button"
                  className={`mf-txn-filter-btn${monthFilter === monthKey ? ' mf-txn-filter-btn-active' : ''}`}
                  onClick={() => {
                    setMonthFilter(monthKey)
                    resetVisibleCount()
                  }}
                >
                  {formatMonthLabel(monthKey)} ({monthCounts[monthKey] ?? 0})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mf-table-summary">
        Showing {visible.length} of {filtered.length} transaction
        {filtered.length === 1 ? '' : 's'}
        {hasActiveFilters && filtered.length !== transactions.length && (
          <> (filtered from {transactions.length})</>
        )}
      </div>

      <div className="mf-table-scroll">
        <table className="mf-table mf-txn-table bank-txn-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Reference</th>
              <th className="mf-table-cell-right">Debit</th>
              <th className="mf-table-cell-right">Credit</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="mf-txn-empty">
                  No transactions match your filters.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.id}>
                  <td className="mf-txn-date">{formatTransactionDate(row.transaction_date)}</td>
                  <td>
                    <div className="mf-fund-cell">
                      <span className="mf-fund-name mf-fund-name-sm" title={row.description}>
                        {row.description?.trim() || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="bank-txn-ref">
                    {row.reference?.trim() || '—'}
                  </td>
                  <td className="mf-table-cell-right bank-txn-debit">
                    {Number(row.debit) > 0 ? formatTradeValue(row.debit) : '—'}
                  </td>
                  <td className="mf-table-cell-right bank-txn-credit">
                    {Number(row.credit) > 0 ? formatTradeValue(row.credit) : '—'}
                  </td>
                  <td className="mf-fund-meta">{row.account_number}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {visibleCount < filtered.length && (
        <div className="mf-txn-load-more">
          <button
            type="button"
            className="shell-page-action-btn"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Load more ({Math.min(PAGE_SIZE, filtered.length - visibleCount)} more)
          </button>
        </div>
      )}
    </div>
  )
}

export default BankTransactionsTable
