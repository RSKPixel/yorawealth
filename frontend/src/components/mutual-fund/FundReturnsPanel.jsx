import { useMemo } from 'react'
import {
  computePeriodReturns,
  computeYearlyReturns,
} from '../../utils/navReturns'
import { formatPctSigned } from '../../utils/mutualFundFormat'

function returnClassName(value) {
  if (value == null || Number.isNaN(value)) {
    return 'mf-return-neutral'
  }
  if (value > 0) {
    return 'mf-gain-positive'
  }
  if (value < 0) {
    return 'mf-gain-negative'
  }
  return 'mf-return-neutral'
}

function FundReturnsPanel({ navHistory }) {
  const periodReturns = useMemo(
    () => computePeriodReturns(navHistory),
    [navHistory],
  )
  const yearlyReturns = useMemo(
    () => computeYearlyReturns(navHistory, 10),
    [navHistory],
  )

  if (!periodReturns.length && !yearlyReturns.length) {
    return (
      <div className="mf-chart-modal-state">Not enough NAV history for returns.</div>
    )
  }

  return (
    <div className="mf-chart-returns-panel">
      <section className="mf-chart-returns-section">
        <h3 className="mf-chart-returns-heading">Period returns</h3>
        <div className="mf-chart-returns-grid">
          {periodReturns.map((row) => (
            <div key={row.label} className="mf-chart-return-cell">
              <span className="mf-chart-return-label">{row.label}</span>
              <span
                className={`mf-chart-return-value ${returnClassName(row.changePct)}`}
              >
                {formatPctSigned(row.changePct)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mf-chart-returns-section">
        <h3 className="mf-chart-returns-heading">Annual returns</h3>
        <div className="mf-chart-returns-grid">
          {yearlyReturns.map((row) => (
            <div key={row.year} className="mf-chart-return-cell">
              <span className="mf-chart-return-label">{row.year}</span>
              <span
                className={`mf-chart-return-value ${returnClassName(row.changePct)}`}
              >
                {formatPctSigned(row.changePct)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default FundReturnsPanel
