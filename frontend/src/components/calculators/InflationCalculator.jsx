import { useMemo, useState } from 'react'
import { FormField, FormInput } from '../form'
import BootstrapIcon from '../icons/BootstrapIcon'
import { calculateFutureCost } from '../../utils/inflationCalculator'
import { formatTradeValue } from '../../utils/mutualFundFormat'

const DEFAULT_MONTHLY = 50000
const DEFAULT_INFLATION = 6
const DEFAULT_YEARS = 20

function resultRow(label, value, emphasize = false) {
  return (
    <div className={`calc-result-row${emphasize ? ' calc-result-row-emphasize' : ''}`}>
      <span className="calc-result-label">{label}</span>
      <span className="calc-result-value">{value}</span>
    </div>
  )
}

function InflationCalculator() {
  const [monthlyExpenses, setMonthlyExpenses] = useState(String(DEFAULT_MONTHLY))
  const [annualInflation, setAnnualInflation] = useState(DEFAULT_INFLATION)
  const [years, setYears] = useState(DEFAULT_YEARS)

  const result = useMemo(
    () => calculateFutureCost(monthlyExpenses, annualInflation, years),
    [monthlyExpenses, annualInflation, years],
  )

  const handleMonthlyChange = (event) => {
    const raw = event.target.value.replace(/[^\d.]/g, '')
    setMonthlyExpenses(raw)
  }

  return (
    <div className="calc-panel">
      <div className="calc-panel-header">
        <div className="calc-panel-title-wrap">
          <BootstrapIcon icon="bi-graph-up-arrow" className="calc-panel-icon" />
          <div>
            <h2 className="calc-panel-title">Inflation Calculator</h2>
            <p className="calc-panel-subtitle">
              See how rising prices change the cost of your lifestyle over time.
            </p>
          </div>
        </div>
      </div>

      <div className="calc-panel-grid">
        <div className="calc-inputs">
          <FormField label="Current monthly expenses (₹)" htmlFor="inflation-monthly">
            <FormInput
              id="inflation-monthly"
              type="text"
              inputMode="decimal"
              value={monthlyExpenses}
              onChange={handleMonthlyChange}
              placeholder="e.g. 50000"
            />
          </FormField>

          <div className="calc-slider-field">
            <div className="calc-slider-label-row">
              <label htmlFor="inflation-rate" className="form-label mb-0">
                Annual inflation
              </label>
              <span className="calc-slider-value">{annualInflation}%</span>
            </div>
            <input
              id="inflation-rate"
              className="calc-slider"
              type="range"
              min={1}
              max={15}
              step={1}
              value={annualInflation}
              onChange={(event) => setAnnualInflation(Number(event.target.value))}
            />
            <div className="calc-slider-ends">
              <span>1%</span>
              <span>15%</span>
            </div>
          </div>

          <div className="calc-slider-field">
            <div className="calc-slider-label-row">
              <label htmlFor="inflation-years" className="form-label mb-0">
                Time period
              </label>
              <span className="calc-slider-value">
                {years} {years === 1 ? 'year' : 'years'}
              </span>
            </div>
            <input
              id="inflation-years"
              className="calc-slider"
              type="range"
              min={1}
              max={70}
              step={1}
              value={years}
              onChange={(event) => setYears(Number(event.target.value))}
            />
            <div className="calc-slider-ends">
              <span>1 yr</span>
              <span>70 yrs</span>
            </div>
          </div>
        </div>

        <div className="calc-results" aria-live="polite">
          <p className="calc-results-heading">Future cost</p>
          {result ? (
            <>
              {resultRow('Today (monthly)', formatTradeValue(result.currentMonthly))}
              {resultRow('Future (monthly)', formatTradeValue(result.futureMonthly), true)}
              {resultRow('Today (annual)', formatTradeValue(result.currentAnnual))}
              {resultRow('Future (annual)', formatTradeValue(result.futureAnnual), true)}
              <div className="calc-result-meta">
                Expenses multiply by{' '}
                <strong>{result.multiplier.toFixed(2)}×</strong>
                {' · '}
                Extra monthly:{' '}
                <strong>{formatTradeValue(result.totalIncrease)}</strong>
              </div>
            </>
          ) : (
            <p className="calc-results-empty">Enter a valid monthly expense amount.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default InflationCalculator
