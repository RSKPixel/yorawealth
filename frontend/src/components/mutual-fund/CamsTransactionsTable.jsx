import { useMemo, useState } from 'react'
import BootstrapIcon from '../icons/BootstrapIcon'
import {
  formatNav,
  formatQuantity,
  formatTradeValue,
  formatTransactionDate,
} from '../../utils/mutualFundFormat'

const PAGE_SIZE = 50

function CamsTransactionsTable({ transactions }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return transactions.filter((row) => {
      if (typeFilter !== 'all' && row.trade_type !== typeFilter) {
        return false
      }
      if (!normalized) return true
      return (
        row.fund_name?.toLowerCase().includes(normalized) ||
        row.folio?.toLowerCase().includes(normalized) ||
        row.isin?.toLowerCase().includes(normalized) ||
        row.amc?.toLowerCase().includes(normalized)
      )
    })
  }, [transactions, query, typeFilter])

  if (!transactions?.length) {
    return null
  }

  const visible = filtered.slice(0, visibleCount)
  const inCount = transactions.filter((t) => t.trade_type === 'IN').length
  const outCount = transactions.length - inCount

  return (
    <div className="mf-txn-panel">
      <div className="mf-txn-toolbar">
        <div className="mf-txn-search-wrap">
          <BootstrapIcon icon="bi-search" className="mf-txn-search-icon" />
          <input
            type="search"
            className="mf-txn-search"
            placeholder="Search fund, folio, ISIN…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setVisibleCount(PAGE_SIZE)
            }}
          />
        </div>
        <div className="mf-txn-filters" role="group" aria-label="Transaction type">
          <button
            type="button"
            className={`mf-txn-filter-btn${typeFilter === 'all' ? ' mf-txn-filter-btn-active' : ''}`}
            onClick={() => {
              setTypeFilter('all')
              setVisibleCount(PAGE_SIZE)
            }}
          >
            All ({transactions.length})
          </button>
          <button
            type="button"
            className={`mf-txn-filter-btn${typeFilter === 'IN' ? ' mf-txn-filter-btn-active' : ''}`}
            onClick={() => {
              setTypeFilter('IN')
              setVisibleCount(PAGE_SIZE)
            }}
          >
            Buy ({inCount})
          </button>
          <button
            type="button"
            className={`mf-txn-filter-btn${typeFilter === 'OUT' ? ' mf-txn-filter-btn-active' : ''}`}
            onClick={() => {
              setTypeFilter('OUT')
              setVisibleCount(PAGE_SIZE)
            }}
          >
            Sell ({outCount})
          </button>
        </div>
      </div>

      <div className="mf-table-summary">
        Showing {visible.length} of {filtered.length} transaction
        {filtered.length === 1 ? '' : 's'}
        {query && filtered.length !== transactions.length && (
          <> (filtered from {transactions.length})</>
        )}
      </div>

      <div className="mf-table-scroll">
        <table className="mf-table mf-txn-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Fund</th>
              <th>Type</th>
              <th className="mf-table-cell-right">Units</th>
              <th className="mf-table-cell-right">NAV</th>
              <th className="mf-table-cell-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="mf-txn-empty">
                  No transactions match your search.
                </td>
              </tr>
            ) : (
              visible.map((row, index) => (
                <tr key={`${row.isin}-${row.transaction_date}-${index}`}>
                  <td className="mf-txn-date">{formatTransactionDate(row.transaction_date)}</td>
                  <td>
                    <div className="mf-fund-cell">
                      <span className="mf-fund-name mf-fund-name-sm" title={row.fund_name}>
                        {row.fund_name}
                      </span>
                      <span className="mf-fund-meta">
                        {row.folio}
                        <span className="mf-fund-meta-sep">·</span>
                        {row.isin}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`mf-trade-badge${
                        row.trade_type === 'IN' ? ' mf-trade-badge-in' : ' mf-trade-badge-out'
                      }`}
                    >
                      {row.trade_type === 'IN' ? 'Buy' : 'Sell'}
                    </span>
                  </td>
                  <td className="mf-table-cell-right">{formatQuantity(row.quantity)}</td>
                  <td className="mf-table-cell-right">{formatNav(row.nav)}</td>
                  <td className="mf-table-cell-right">{formatTradeValue(row.trade_value)}</td>
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

export default CamsTransactionsTable
