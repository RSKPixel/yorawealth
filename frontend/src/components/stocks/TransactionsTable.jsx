import { useMemo, useState } from 'react'
import BootstrapIcon from '../icons/BootstrapIcon'
import Tooltip from '../common/Tooltip'
import {
  formatTradeValue,
  formatTransactionDate,
} from '../../utils/mutualFundFormat'
import { formatStockQuantity } from '../../utils/stockFormat'

const PAGE_SIZE = 50

function TransactionsTable({ transactions, onEditManual, onDeleteManual, isMutating }) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const hasManualActions = Boolean(onEditManual || onDeleteManual)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return transactions.filter((row) => {
      if (typeFilter !== 'all' && row.trade_type !== typeFilter) {
        return false
      }
      if (!normalized) return true
      return (
        row.symbol?.toLowerCase().includes(normalized) ||
        row.name?.toLowerCase().includes(normalized) ||
        row.exchange?.toLowerCase().includes(normalized)
      )
    })
  }, [transactions, query, typeFilter])

  if (!transactions?.length) {
    return null
  }

  const visible = filtered.slice(0, visibleCount)
  const buyCount = transactions.filter((t) => t.trade_type === 'BUY').length
  const sellCount = transactions.length - buyCount

  return (
    <div className="mf-txn-panel">
      <div className="mf-txn-toolbar">
        <div className="mf-txn-search-wrap">
          <BootstrapIcon icon="bi-search" className="mf-txn-search-icon" />
          <input
            type="search"
            className="mf-txn-search"
            placeholder="Search symbol, name, exchange…"
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
            className={`mf-txn-filter-btn${typeFilter === 'BUY' ? ' mf-txn-filter-btn-active' : ''}`}
            onClick={() => {
              setTypeFilter('BUY')
              setVisibleCount(PAGE_SIZE)
            }}
          >
            Buy ({buyCount})
          </button>
          <button
            type="button"
            className={`mf-txn-filter-btn${typeFilter === 'SELL' ? ' mf-txn-filter-btn-active' : ''}`}
            onClick={() => {
              setTypeFilter('SELL')
              setVisibleCount(PAGE_SIZE)
            }}
          >
            Sell ({sellCount})
          </button>
        </div>
      </div>

      <div className="mf-table-wrap">
        <div className="mf-table-scroll">
          <table className="mf-table mf-txn-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Symbol</th>
                <th>Type</th>
                <th className="mf-table-cell-right">Qty</th>
                <th className="mf-table-cell-right">Price</th>
                <th className="mf-table-cell-right">Value</th>
                {hasManualActions && (
                  <th className="mf-table-cell-right stocks-txn-actions-col">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.trade_id}>
                  <td className="tabular-nums">{formatTransactionDate(row.transaction_date)}</td>
                  <td>
                    <span className="font-medium text-slate-100">{row.symbol}</span>
                    {row.is_manual ? (
                      <span className="mf-fund-meta ml-1.5">Manual</span>
                    ) : (
                      row.exchange && (
                        <span className="mf-fund-meta ml-1.5">{row.exchange}</span>
                      )
                    )}
                  </td>
                  <td>
                    <span
                      className={
                        row.trade_type === 'SELL'
                          ? 'mf-txn-type-out'
                          : 'mf-txn-type-in'
                      }
                    >
                      {row.trade_type}
                    </span>
                  </td>
                  <td className="mf-table-cell-right tabular-nums">
                    {formatStockQuantity(row.quantity)}
                  </td>
                  <td className="mf-table-cell-right tabular-nums">
                    {formatTradeValue(row.price)}
                  </td>
                  <td className="mf-table-cell-right tabular-nums">
                    {formatTradeValue(row.trade_value)}
                  </td>
                  {hasManualActions && (
                    <td className="mf-table-cell-right">
                      {row.is_manual ? (
                        <div className="stocks-txn-actions">
                          <Tooltip label="Edit manual trade" placement="left" delayMs={300}>
                            <button
                              type="button"
                              className="stocks-txn-action-btn"
                              onClick={() => onEditManual?.(row)}
                              disabled={isMutating}
                              aria-label={`Edit ${row.symbol} manual trade`}
                            >
                              <BootstrapIcon icon="bi-pencil" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Delete manual trade" placement="left" delayMs={300}>
                            <button
                              type="button"
                              className="stocks-txn-action-btn stocks-txn-action-btn-danger"
                              onClick={() => onDeleteManual?.(row)}
                              disabled={isMutating}
                              aria-label={`Delete ${row.symbol} manual trade`}
                            >
                              <BootstrapIcon icon="bi-trash" />
                            </button>
                          </Tooltip>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {visibleCount < filtered.length && (
        <div className="mf-txn-load-more">
          <button
            type="button"
            className="shell-page-action-btn"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  )
}

export default TransactionsTable
