import { useMemo, useState } from 'react'
import BootstrapIcon from '../icons/BootstrapIcon'
import { formatTradeValue, formatTransactionDate } from '../../utils/mutualFundFormat'

const PAGE_SIZE = 50

const TYPE_LABELS = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  interest: 'Interest',
  other: 'Other',
}

function PpfTransactionsTable({ transactions }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return transactions.filter((row) => {
      if (typeFilter !== 'all' && row.transaction_type !== typeFilter) {
        return false
      }
      if (!normalized) return true
      return (
        row.account_number?.toLowerCase().includes(normalized) ||
        row.remarks?.toLowerCase().includes(normalized) ||
        row.cheque_number?.toLowerCase().includes(normalized)
      )
    })
  }, [transactions, query, typeFilter])

  if (!transactions?.length) {
    return null
  }

  const visible = filtered.slice(0, visibleCount)
  const depositCount = transactions.filter((row) => row.transaction_type === 'deposit').length
  const interestCount = transactions.filter((row) => row.transaction_type === 'interest').length
  const withdrawalCount = transactions.filter((row) => row.transaction_type === 'withdrawal').length

  return (
    <div className="mf-txn-panel">
      <div className="mf-txn-toolbar">
        <div className="mf-txn-search-wrap">
          <BootstrapIcon icon="bi-search" className="mf-txn-search-icon" />
          <input
            type="search"
            className="mf-txn-search"
            placeholder="Search remarks, account…"
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
            className={`mf-txn-filter-btn${typeFilter === 'deposit' ? ' mf-txn-filter-btn-active' : ''}`}
            onClick={() => {
              setTypeFilter('deposit')
              setVisibleCount(PAGE_SIZE)
            }}
          >
            Deposits ({depositCount})
          </button>
          <button
            type="button"
            className={`mf-txn-filter-btn${typeFilter === 'interest' ? ' mf-txn-filter-btn-active' : ''}`}
            onClick={() => {
              setTypeFilter('interest')
              setVisibleCount(PAGE_SIZE)
            }}
          >
            Interest ({interestCount})
          </button>
          {withdrawalCount > 0 && (
            <button
              type="button"
              className={`mf-txn-filter-btn${typeFilter === 'withdrawal' ? ' mf-txn-filter-btn-active' : ''}`}
              onClick={() => {
                setTypeFilter('withdrawal')
                setVisibleCount(PAGE_SIZE)
              }}
            >
              Withdrawals ({withdrawalCount})
            </button>
          )}
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
              <th>Type</th>
              <th>Remarks</th>
              <th className="mf-table-cell-right">Withdrawal</th>
              <th className="mf-table-cell-right">Deposit</th>
              <th className="mf-table-cell-right">Balance</th>
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
              visible.map((row) => (
                <tr key={row.id}>
                  <td className="mf-txn-date">{formatTransactionDate(row.transaction_date)}</td>
                  <td>
                    <span
                      className={`mf-trade-badge${
                        row.transaction_type === 'deposit'
                          ? ' mf-trade-badge-in'
                          : row.transaction_type === 'withdrawal'
                            ? ' mf-trade-badge-out'
                            : ''
                      }`}
                    >
                      {TYPE_LABELS[row.transaction_type] ?? row.transaction_type}
                    </span>
                  </td>
                  <td>
                    <div className="mf-fund-cell">
                      <span className="mf-fund-name mf-fund-name-sm" title={row.remarks ?? ''}>
                        {row.remarks?.trim() || '—'}
                      </span>
                      <span className="mf-fund-meta">{row.account_number}</span>
                    </div>
                  </td>
                  <td className="mf-table-cell-right">
                    {row.withdrawal_amount > 0 ? formatTradeValue(row.withdrawal_amount) : '—'}
                  </td>
                  <td className="mf-table-cell-right">
                    {row.deposit_amount > 0 ? formatTradeValue(row.deposit_amount) : '—'}
                  </td>
                  <td className="mf-table-cell-right">{formatTradeValue(row.balance)}</td>
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

export default PpfTransactionsTable
