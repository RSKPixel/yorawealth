import { useMemo, useState } from 'react'
import { FormField, FormInput } from '../form'
import BootstrapIcon from '../icons/BootstrapIcon'
import { calculateFutureValue } from '../../utils/futureValueCalculator'
import { formatTradeValue } from '../../utils/mutualFundFormat'

const DEFAULT_PRINCIPAL = 100000
const DEFAULT_ANNUAL_ADDITION = 120000
const DEFAULT_GROWTH_RATE = 12
const DEFAULT_YEARS = 20

function resultRow(label, value, emphasize = false) {
  return (
    <div className={`calc-result-row${emphasize ? ' calc-result-row-emphasize' : ''}`}>
      <span className="calc-result-label">{label}</span>
      <span className="calc-result-value">{value}</span>
    </div>
  )
}

function FutureValueCalculator() {
  const [currentPrincipal, setCurrentPrincipal] = useState(String(DEFAULT_PRINCIPAL))
  const [annualAddition, setAnnualAddition] = useState(String(DEFAULT_ANNUAL_ADDITION))
  const [growthRate, setGrowthRate] = useState(DEFAULT_GROWTH_RATE)
  const [years, setYears] = useState(DEFAULT_YEARS)

  const result = useMemo(
    () => calculateFutureValue(currentPrincipal, annualAddition, growthRate, years),
    [currentPrincipal, annualAddition, growthRate, years],
  )

  const handleAmountChange = (setter) => (event) => {
    const raw = event.target.value.replace(/[^\d.]/g, '')
    setter(raw)
  }

  return (
    <div className="calc-panel">
      <div className="calc-panel-header">
        <div className="calc-panel-title-wrap">
          <BootstrapIcon icon="bi-piggy-bank" className="calc-panel-icon" />
          <div>
            <h2 className="calc-panel-title">Future Value (Compound Interest) Calculator</h2>
            <p className="calc-panel-subtitle">
              Project how your principal and annual additions grow with compound interest.
            </p>
          </div>
        </div>
      </div>

      <div className="calc-panel-grid">
        <div className="calc-inputs">
          <FormField label="Current principal (₹)" htmlFor="fv-principal">
            <FormInput
              id="fv-principal"
              type="text"
              inputMode="decimal"
              value={currentPrincipal}
              onChange={handleAmountChange(setCurrentPrincipal)}
              placeholder="e.g. 100000"
            />
          </FormField>

          <FormField label="Annual addition (₹)" htmlFor="fv-addition">
            <FormInput
              id="fv-addition"
              type="text"
              inputMode="decimal"
              value={annualAddition}
              onChange={handleAmountChange(setAnnualAddition)}
              placeholder="e.g. 120000"
            />
          </FormField>

          <div className="calc-slider-field">
            <div className="calc-slider-label-row">
              <label htmlFor="fv-years" className="form-label mb-0">
                Years to grow
              </label>
              <span className="calc-slider-value">
                {years} {years === 1 ? 'year' : 'years'}
              </span>
            </div>
            <input
              id="fv-years"
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

          <div className="calc-slider-field">
            <div className="calc-slider-label-row">
              <label htmlFor="fv-growth" className="form-label mb-0">
                Growth rate
              </label>
              <span className="calc-slider-value">{growthRate}%</span>
            </div>
            <input
              id="fv-growth"
              className="calc-slider"
              type="range"
              min={1}
              max={30}
              step={1}
              value={growthRate}
              onChange={(event) => setGrowthRate(Number(event.target.value))}
            />
            <div className="calc-slider-ends">
              <span>1%</span>
              <span>30%</span>
            </div>
          </div>
        </div>

        <div className="calc-results" aria-live="polite">
          <p className="calc-results-heading">Future value</p>
          {result ? (
            <>
              {resultRow('Future value', formatTradeValue(result.futureValue), true)}
              {resultRow('From principal', formatTradeValue(result.principalFuture))}
              {resultRow('From annual additions', formatTradeValue(result.additionFuture))}
              {resultRow('Total invested', formatTradeValue(result.totalInvested))}
              {resultRow('Total gain', formatTradeValue(result.totalGain))}
              <div className="calc-result-meta">
                Gain on investment:{' '}
                <strong>
                  {result.gainPercent == null ? '—' : `${result.gainPercent.toFixed(1)}%`}
                </strong>
              </div>
              <p className="calc-result-meta mt-3">
                Illustration only. Markets do not offer fixed returns and actual results may
                differ.
              </p>
            </>
          ) : (
            <p className="calc-results-empty">Enter valid investment amounts.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default FutureValueCalculator
