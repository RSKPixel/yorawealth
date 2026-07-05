import { useMemo, useState } from 'react'
import SortableTableHead from '../common/SortableTableHead'
import Tooltip from '../common/Tooltip'
import {
  formatPctSigned,
  formatPercent,
  formatTradeValue,
} from '../../utils/mutualFundFormat'
import { formatStockQuantity } from '../../utils/stockFormat'
import { compareSortValues, toggleSortKey } from '../../utils/tableSort'

function gainClassName(value) {
  if (value > 0) return 'mf-gain-positive'
  if (value < 0) return 'mf-gain-negative'
  return 'mf-gain-neutral'
}

function weightPct(currentValue, totalValue) {
  if (!totalValue) return 0
  return (currentValue / totalValue) * 100
}

function holdingSortValue(row, sortKey, weightBase) {
  switch (sortKey) {
    case 'symbol':
      return row.symbol?.toLowerCase() ?? ''
    case 'name':
      return row.name?.toLowerCase() ?? ''
    case 'weight':
      return weightPct(row.current_value, weightBase)
    case 'quantity':
      return row.quantity ?? 0
    case 'value':
      return row.current_value ?? 0
    case 'invested':
      return row.invested_amount ?? 0
    case 'gain':
      return row.unrealized_gain ?? 0
    case 'xirr':
      return row.xirr
    default:
      return 0
  }
}

function HoldingsTable({ holdings, totalCurrentValue }) {
  const [sort, setSort] = useState({ key: 'value', direction: 'desc' })

  const totals = useMemo(() => {
    return holdings.reduce(
      (acc, row) => {
        acc.currentValue += row.current_value
        acc.invested += row.invested_amount
        acc.gain += row.unrealized_gain
        if (row.xirr != null && !Number.isNaN(row.xirr)) {
          acc.xirrWeight += row.current_value
          acc.xirrWeighted += row.xirr * row.current_value
        }
        return acc
      },
      { currentValue: 0, invested: 0, gain: 0, xirrWeight: 0, xirrWeighted: 0 },
    )
  }, [holdings])

  const sortedHoldings = useMemo(() => {
    const rows = [...holdings]
    rows.sort((left, right) =>
      compareSortValues(
        holdingSortValue(left, sort.key, totalCurrentValue),
        holdingSortValue(right, sort.key, totalCurrentValue),
        sort.direction,
      ),
    )
    return rows
  }, [holdings, sort, totalCurrentValue])

  const handleSort = (sortKey) => {
    setSort((current) => toggleSortKey(current, sortKey))
  }

  const portfolioXirr =
    totals.xirrWeight > 0 ? totals.xirrWeighted / totals.xirrWeight : null

  return (
    <div className="mf-table-wrap mf-holdings-filter-all">
      <div className="mf-table-scroll mf-holdings-table-scroll">
        <table className="mf-table mf-holdings-table">
          <thead>
            <tr>
              <SortableTableHead
                label="Symbol"
                sortKey="symbol"
                sort={sort}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Weight"
                sortKey="weight"
                sort={sort}
                onSort={handleSort}
                className="mf-table-cell-right"
              />
              <SortableTableHead
                label="Qty"
                sortKey="quantity"
                sort={sort}
                onSort={handleSort}
                className="mf-table-cell-right"
              />
              <SortableTableHead
                label="Value"
                sortKey="value"
                sort={sort}
                onSort={handleSort}
                className="mf-table-cell-right"
              />
              <SortableTableHead
                label="Invested"
                sortKey="invested"
                sort={sort}
                onSort={handleSort}
                className="mf-table-cell-right"
              />
              <SortableTableHead
                label="Gain"
                sortKey="gain"
                sort={sort}
                onSort={handleSort}
                className="mf-table-cell-right"
              />
              <SortableTableHead
                label="XIRR"
                sortKey="xirr"
                sort={sort}
                onSort={handleSort}
                className="mf-table-cell-right"
              />
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.map((row) => {
              const gainPct =
                row.invested_amount > 0
                  ? (row.unrealized_gain / row.invested_amount) * 100
                  : null

              return (
                <tr key={row.symbol}>
                  <td>
                    <div className="mf-fund-title-row">
                      <span className="mf-fund-name" title={row.name}>
                        {row.symbol}
                      </span>
                    </div>
                    {row.name && (
                      <span className="mf-fund-meta truncate" title={row.name}>
                        {row.name}
                      </span>
                    )}
                  </td>
                  <td className="mf-table-cell-right tabular-nums">
                    {weightPct(row.current_value, totalCurrentValue).toFixed(1)}%
                  </td>
                  <td className="mf-table-cell-right tabular-nums">
                    {formatStockQuantity(row.quantity)}
                  </td>
                  <td className="mf-table-cell-right tabular-nums">
                    <div>{formatTradeValue(row.current_value)}</div>
                    <span className="mf-fund-meta">
                      ({formatTradeValue(row.current_price)})
                    </span>
                  </td>
                  <td className="mf-table-cell-right tabular-nums">
                    <div>{formatTradeValue(row.invested_amount)}</div>
                    <span className="mf-fund-meta">
                      ({formatTradeValue(row.avg_cost)})
                    </span>
                  </td>
                  <td className={`mf-table-cell-right tabular-nums ${gainClassName(row.unrealized_gain)}`}>
                    <Tooltip
                      label={formatPctSigned(gainPct)}
                      delayMs={400}
                    >
                      <span>{formatTradeValue(row.unrealized_gain)}</span>
                    </Tooltip>
                  </td>
                  <td className={`mf-table-cell-right tabular-nums ${gainClassName(row.xirr)}`}>
                    {formatPercent(row.xirr)}
                  </td>
                </tr>
              )
            })}
            <tr className="mf-table-total-row">
              <td>Total</td>
              <td className="mf-table-cell-right tabular-nums">100%</td>
              <td className="mf-table-cell-right tabular-nums">—</td>
              <td className="mf-table-cell-right tabular-nums">
                {formatTradeValue(totals.currentValue)}
              </td>
              <td className="mf-table-cell-right tabular-nums">
                {formatTradeValue(totals.invested)}
              </td>
              <td className={`mf-table-cell-right tabular-nums ${gainClassName(totals.gain)}`}>
                {formatTradeValue(totals.gain)}
              </td>
              <td className={`mf-table-cell-right tabular-nums ${gainClassName(portfolioXirr)}`}>
                {formatPercent(portfolioXirr)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default HoldingsTable
