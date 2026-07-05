import { useMemo, useState } from 'react'
import BootstrapIcon from '../icons/BootstrapIcon'
import SortableTableHead from '../common/SortableTableHead'
import Tooltip from '../common/Tooltip'
import {
  formatNav,
  formatPct,
  formatPctSigned,
  formatPercent,
  formatQuantity,
  formatTradeValue,
  formatTransactionDate,
} from '../../utils/mutualFundFormat'
import { compareSortValues, toggleSortKey } from '../../utils/tableSort'
import FundChartModal from './FundChartModal'
import CategoryAllocationStrip from './CategoryAllocationStrip'
import {
  categoryWeightPct,
  computeCategoryAllocation,
  normalizeAssetClass,
  portfolioWeightPct,
} from '../../utils/categoryAllocation'

function gainClassName(value) {
  if (value > 0) return 'mf-gain-positive'
  if (value < 0) return 'mf-gain-negative'
  return 'mf-gain-neutral'
}

function allocationPct(currentValue, totalValue) {
  return portfolioWeightPct(currentValue, totalValue)
}

function navDateTitle(navDate) {
  if (!navDate) return undefined
  return `NAV as on ${formatTransactionDate(navDate)}`
}

function holdingSortValue(row, sortKey, weightBase) {
  switch (sortKey) {
    case 'fund':
      return row.fund_name?.toLowerCase() ?? ''
    case 'weight':
      return allocationPct(row.current_value, weightBase)
    case 'units':
      return row.quantity ?? 0
    case 'nav':
      return row.current_nav ?? 0
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

function PortfolioHoldingsTable({ holdings, totalCurrentValue }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [chartRow, setChartRow] = useState(null)
  const [sort, setSort] = useState({ key: 'value', direction: 'desc' })

  const categoryAllocation = useMemo(
    () => computeCategoryAllocation(holdings),
    [holdings],
  )

  const filteredHoldings = useMemo(() => {
    if (typeFilter === 'all') return holdings
    return holdings.filter(
      (row) => normalizeAssetClass(row.asset_class) === typeFilter,
    )
  }, [holdings, typeFilter])

  const filteredTotals = useMemo(() => {
    const totals = filteredHoldings.reduce(
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
      {
        currentValue: 0,
        invested: 0,
        gain: 0,
        xirrWeight: 0,
        xirrWeighted: 0,
      },
    )

    return {
      ...totals,
      units: filteredHoldings.reduce((sum, row) => sum + (row.quantity ?? 0), 0),
      gainPct: totals.invested > 0 ? (totals.gain / totals.invested) * 100 : null,
      xirr:
        totals.xirrWeight > 0 ? totals.xirrWeighted / totals.xirrWeight : null,
    }
  }, [filteredHoldings])

  const filteredTotalValue = filteredTotals.currentValue

  const weightBase =
    typeFilter === 'all' ? totalCurrentValue : filteredTotalValue

  const sortedHoldings = useMemo(() => {
    const rows = [...filteredHoldings]
    rows.sort((left, right) =>
      compareSortValues(
        holdingSortValue(left, sort.key, weightBase),
        holdingSortValue(right, sort.key, weightBase),
        sort.direction,
      ),
    )
    return rows
  }, [filteredHoldings, sort, weightBase])

  const handleSort = (sortKey) => {
    setSort((current) => toggleSortKey(current, sortKey))
  }

  if (!holdings?.length) {
    return null
  }

  return (
    <div className={`mf-table-wrap mf-holdings-filter-${typeFilter.toLowerCase()}`}>
      {chartRow && (
        <FundChartModal row={chartRow} onClose={() => setChartRow(null)} />
      )}
      <CategoryAllocationStrip
        holdings={holdings}
        totalCurrentValue={totalCurrentValue}
        typeFilter={typeFilter}
        onFilterChange={setTypeFilter}
      />

      <div className="mf-table-scroll mf-holdings-table-scroll">
        <table className="mf-table mf-holdings-table">
          <thead>
            <tr>
              <SortableTableHead
                label="Fund"
                sortKey="fund"
                sort={sort}
                onSort={handleSort}
                className="mf-holdings-col-fund"
              />
              <SortableTableHead
                label="Weight"
                sortKey="weight"
                sort={sort}
                onSort={handleSort}
                className="mf-table-cell-right mf-holdings-col-alloc"
              />
              <SortableTableHead
                label="Units"
                sortKey="units"
                sort={sort}
                onSort={handleSort}
                className="mf-table-cell-right mf-holdings-col-units"
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
            {sortedHoldings.length === 0 ? (
              <tr>
                <td colSpan={7} className="mf-txn-empty">
                  {typeFilter === 'all'
                    ? 'No holdings.'
                    : `No ${typeFilter} holdings.`}
                </td>
              </tr>
            ) : (
              sortedHoldings.map((row) => {
              const portfolioWeight = allocationPct(row.current_value, totalCurrentValue)
              const weight = allocationPct(row.current_value, weightBase)
              const inCategoryWeight = categoryWeightPct(
                row,
                categoryAllocation.values,
              )
              const gainPct =
                row.invested_amount > 0
                  ? (row.unrealized_gain / row.invested_amount) * 100
                  : null

              return (
                <tr key={`${row.folio}-${row.isin}`}>
                  <td className="mf-holdings-col-fund">
                    <div className="mf-fund-cell">
                      <div className="mf-fund-title-row">
                        <span className="mf-fund-name" title={row.fund_name}>
                          {row.fund_name}
                        </span>
                        {row.asset_class && (
                          <span
                            className={`mf-fund-type-badge mf-fund-type-${row.asset_class.toLowerCase()}`}
                          >
                            {row.asset_class}
                          </span>
                        )}
                        <button
                          type="button"
                          className="mf-fund-chart-btn"
                          aria-label={`Open NAV chart for ${row.fund_name}`}
                          onClick={() => setChartRow(row)}
                        >
                          <BootstrapIcon icon="bi-graph-up" />
                        </button>
                      </div>
                      <span className="mf-fund-meta">
                        {row.fund_type || row.amc}
                        <span className="mf-fund-meta-sep">·</span>
                        {row.folio}
                      </span>
                    </div>
                  </td>
                  <td className="mf-table-cell-right mf-holdings-col-alloc">
                    <div className="mf-alloc-cell">
                      <div className="mf-alloc-bar-track" aria-hidden="true">
                        <div
                          className="mf-alloc-bar-fill"
                          style={{ width: `${Math.min(weight, 100)}%` }}
                        />
                      </div>
                      <span className="mf-alloc-pct">{formatPct(weight)}</span>
                      {typeFilter === 'all' && (
                        <span className="mf-alloc-category-pct">
                          {formatPct(inCategoryWeight)} of{' '}
                          {normalizeAssetClass(row.asset_class)}
                        </span>
                      )}
                      {typeFilter !== 'all' && (
                        <span className="mf-alloc-category-pct">
                          {formatPct(portfolioWeight)} of portfolio
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="mf-table-cell-right mf-holdings-col-units">
                    {formatQuantity(row.quantity)}
                  </td>
                  <td className="mf-table-cell-right mf-holdings-value tabular-nums">
                    <div>{formatTradeValue(row.current_value)}</div>
                    {row.current_nav_date ? (
                      <Tooltip label={navDateTitle(row.current_nav_date)} delayMs={1000}>
                        <span className="mf-fund-meta mf-holdings-value-trigger">
                          ({formatNav(row.current_nav)})
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="mf-fund-meta">({formatNav(row.current_nav)})</span>
                    )}
                  </td>
                  <td className="mf-table-cell-right tabular-nums">
                    <div>{formatTradeValue(row.invested_amount)}</div>
                    <span className="mf-fund-meta">({formatNav(row.avg_cost)})</span>
                  </td>
                  <td className="mf-table-cell-right">
                    <div className="mf-gain-cell">
                      <span className={gainClassName(row.unrealized_gain)}>
                        {formatTradeValue(row.unrealized_gain)}
                      </span>
                      {gainPct != null && (
                        <span className={`mf-gain-pct ${gainClassName(row.unrealized_gain)}`}>
                          {formatPctSigned(gainPct)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="mf-table-cell-right">
                    <span className={gainClassName(row.xirr)}>{formatPercent(row.xirr)}</span>
                  </td>
                </tr>
              )
            })
            )}
          </tbody>
          {sortedHoldings.length > 0 && (
            <tfoot>
              <tr className="mf-table-total-row">
                <td className="mf-holdings-col-fund">
                  <span className="mf-table-total-label">Total</span>
                  <span className="mf-fund-meta">
                    {sortedHoldings.length} fund
                    {sortedHoldings.length === 1 ? '' : 's'}
                    {typeFilter !== 'all' && (
                      <>
                        <span className="mf-fund-meta-sep">·</span>
                        {typeFilter}
                      </>
                    )}
                  </span>
                </td>
                <td className="mf-table-cell-right mf-holdings-col-alloc">
                  {formatPct(100)}
                </td>
                <td className="mf-table-cell-right mf-holdings-col-units">
                  {formatQuantity(filteredTotals.units)}
                </td>
                <td className="mf-table-cell-right mf-holdings-value tabular-nums">
                  {formatTradeValue(filteredTotals.currentValue)}
                </td>
                <td className="mf-table-cell-right tabular-nums">
                  {formatTradeValue(filteredTotals.invested)}
                </td>
                <td className="mf-table-cell-right">
                  <div className="mf-gain-cell">
                    <span className={gainClassName(filteredTotals.gain)}>
                      {formatTradeValue(filteredTotals.gain)}
                    </span>
                    {filteredTotals.gainPct != null && (
                      <span className={`mf-gain-pct ${gainClassName(filteredTotals.gain)}`}>
                        {formatPctSigned(filteredTotals.gainPct)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="mf-table-cell-right">
                  <span className={gainClassName(filteredTotals.xirr)}>
                    {formatPercent(filteredTotals.xirr)}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

export default PortfolioHoldingsTable
