import { useMemo } from 'react'
import {
  computeRebalancing,
  parseTargetPctMap,
} from '../../utils/categoryAllocation'
import {
  formatPct,
  formatTradeValue,
  formatTradeValueInMillions,
} from '../../utils/mutualFundFormat'

function categoryClassName(name) {
  return `mf-allocation-category mf-allocation-category-${name.toLowerCase()}`
}

function adjustClassName(delta, withinBuffer) {
  if (delta == null || withinBuffer) {
    return 'mf-rebalancing-adjust-neutral'
  }
  return delta > 0 ? 'mf-gain-positive' : 'mf-gain-negative'
}

function formatAdjustValue(delta, withinBuffer) {
  if (delta == null || withinBuffer) {
    return '—'
  }
  if (delta > 0) {
    return `+${formatTradeValue(delta)}`
  }
  return formatTradeValue(delta)
}

function diffPctClassName(pctDrift, withinBuffer) {
  if (pctDrift == null || withinBuffer) {
    return 'mf-rebalancing-adjust-neutral'
  }
  if (pctDrift > 0) {
    return 'mf-gain-negative'
  }
  if (pctDrift < 0) {
    return 'mf-gain-positive'
  }
  return 'mf-rebalancing-adjust-neutral'
}

function formatDiffPct(pctDrift, withinBuffer) {
  if (pctDrift == null) {
    return '—'
  }
  if (withinBuffer) {
    return '—'
  }
  const label = formatPct(Math.abs(pctDrift))
  if (pctDrift > 0) {
    return `+${label}`
  }
  if (pctDrift < 0) {
    return `−${label}`
  }
  return formatPct(0)
}

function RebalancingPanel({ allocation, targets, isLoading }) {
  const targetPcts = useMemo(() => parseTargetPctMap(targets), [targets])
  const rebalancing = useMemo(
    () => computeRebalancing(allocation, targetPcts),
    [allocation, targetPcts],
  )

  if (!rebalancing.total) {
    return (
      <div className="mf-allocation-panel">
        <p className="mf-allocation-hint">No portfolio value to rebalance.</p>
      </div>
    )
  }

  const showAdjust = !isLoading && rebalancing.hasTargets

  return (
    <div className="mf-allocation-panel">
      <div className="mf-allocation-table-wrap">
        <table className="mf-allocation-table mf-rebalancing-table">
          <thead>
            <tr>
              <th>Asset class</th>
              <th className="mf-table-cell-right">Value (₹M)</th>
              <th className="mf-table-cell-right">Current Allocation</th>
              <th className="mf-table-cell-right">Target Allocation</th>
              <th className="mf-table-cell-right">Diff %</th>
              <th className="mf-table-cell-right">Adjust value</th>
            </tr>
          </thead>
          <tbody>
            {rebalancing.rows.map((row) => (
              <tr key={row.name}>
                <td>
                  <span className={categoryClassName(row.name)}>{row.name}</span>
                </td>
                <td className="mf-table-cell-right mf-allocation-current">
                  {formatTradeValueInMillions(row.currentValue)}
                </td>
                <td className="mf-table-cell-right mf-allocation-current">
                  {formatPct(row.currentPct)}
                </td>
                <td className="mf-table-cell-right">
                  {isLoading || row.targetPct == null
                    ? '—'
                    : formatPct(row.targetPct)}
                </td>
                <td
                  className={`mf-table-cell-right mf-rebalancing-adjust ${
                    showAdjust
                      ? diffPctClassName(row.pctDrift, row.withinBuffer)
                      : 'mf-rebalancing-adjust-neutral'
                  }`}
                >
                  {showAdjust ? formatDiffPct(row.pctDrift, row.withinBuffer) : '—'}
                </td>
                <td
                  className={`mf-table-cell-right mf-rebalancing-adjust ${
                    showAdjust
                      ? adjustClassName(row.delta, row.withinBuffer)
                      : 'mf-rebalancing-adjust-neutral'
                  }`}
                >
                  {showAdjust ? formatAdjustValue(row.delta, row.withinBuffer) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="mf-allocation-total-row">
              <td className="mf-allocation-total-label">Total</td>
              <td className="mf-table-cell-right">
                {formatTradeValueInMillions(rebalancing.total)}
              </td>
              <td className="mf-table-cell-right">{formatPct(100)}</td>
              <td className="mf-table-cell-right">
                {showAdjust ? formatPct(100) : '—'}
              </td>
              <td className="mf-table-cell-right mf-rebalancing-adjust-neutral">—</td>
              <td className="mf-table-cell-right mf-rebalancing-adjust-neutral">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p
        className={`mf-allocation-hint mf-allocation-hint-warn${
          isLoading || rebalancing.hasTargets ? ' mf-allocation-tab-panel-hidden' : ''
        }`}
        aria-hidden={isLoading || rebalancing.hasTargets}
      >
        Set Target Allocation in the Allocation tab to see rebalancing amounts.
      </p>

      <p
        className={`mf-allocation-hint${
          !isLoading && rebalancing.hasTargets ? '' : ' mf-allocation-tab-panel-hidden'
        }`}
        aria-hidden={isLoading || !rebalancing.hasTargets}
      >
        Adjust value shows how much to add (+) or remove (−) in each class in rupees.
        Within ±1% of target is treated as balanced.
      </p>
    </div>
  )
}

export default RebalancingPanel
