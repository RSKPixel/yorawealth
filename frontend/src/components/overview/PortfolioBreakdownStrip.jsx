import { Link } from 'react-router'
import { formatPct, formatTradeValue } from '../../utils/mutualFundFormat'

function PortfolioBreakdownStrip({ portfolios, totalCurrentValue }) {
  if (!totalCurrentValue) {
    return null
  }

  return (
    <div
      className="mf-category-alloc-strip"
      role="group"
      aria-label="Portfolio breakdown by asset class"
    >
      <div className="mf-category-alloc-item mf-category-alloc-all">
        <div className="mf-category-alloc-head">
          <span className="mf-category-alloc-name">Total</span>
          <span className="mf-category-alloc-pct">{formatPct(100)}</span>
        </div>
        <div className="mf-category-alloc-meta">
          <span>{formatTradeValue(totalCurrentValue)}</span>
          <span className="mf-fund-meta-sep">·</span>
          <span>
            {portfolios.reduce((count, portfolio) => count + portfolio.count, 0)} holdings
          </span>
        </div>
        <div className="mf-category-alloc-track" aria-hidden="true">
          <div
            className="mf-category-alloc-fill mf-category-alloc-fill-all"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {portfolios.map((portfolio) => {
        if (!portfolio.value) return null

        const pct = (portfolio.value / totalCurrentValue) * 100

        return (
          <Link
            key={portfolio.key}
            to={portfolio.path}
            className={`mf-category-alloc-item mf-category-alloc-${portfolio.tone}`}
          >
            <div className="mf-category-alloc-head">
              <span className="mf-category-alloc-name">{portfolio.label}</span>
              <span className="mf-category-alloc-pct">{formatPct(pct)}</span>
            </div>
            <div className="mf-category-alloc-meta">
              <span>{formatTradeValue(portfolio.value)}</span>
              <span className="mf-fund-meta-sep">·</span>
              <span>
                {portfolio.count} {portfolio.countLabel}
              </span>
            </div>
            <div className="mf-category-alloc-track" aria-hidden="true">
              <div
                className={`mf-category-alloc-fill mf-category-alloc-fill-${portfolio.fillTone}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export default PortfolioBreakdownStrip
