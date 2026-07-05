import BootstrapIcon from '../icons/BootstrapIcon'
import Tooltip from '../common/Tooltip'
import {
  formatPctSigned,
  formatPercent,
  formatTradeValue,
  formatTradeValueCompact,
  formatTradeValueTooltip,
} from '../../utils/mutualFundFormat'

function gainClassName(value) {
  if (value > 0) return 'mf-stat-gain-positive'
  if (value < 0) return 'mf-stat-gain-negative'
  return 'mf-stat-gain-neutral'
}

function moneyTablet(label, amount, valueClass) {
  return {
    label,
    value: formatTradeValueCompact(amount),
    tooltip: formatTradeValueTooltip(amount),
    money: true,
    valueClass,
  }
}

function computeGainsLoss(holdings) {
  if (!holdings?.length) {
    return null
  }

  let gains = 0
  let loss = 0

  for (const row of holdings) {
    if (row.unrealized_gain > 0) {
      gains += row.unrealized_gain
    } else if (row.unrealized_gain < 0) {
      loss += Math.abs(row.unrealized_gain)
    }
  }

  return { gains, loss }
}

function PortfolioSummaryCards({ summary, holdings }) {
  if (!summary) return null

  const gainPct =
    summary.total_invested > 0
      ? (summary.total_unrealized_gain / summary.total_invested) * 100
      : null

  const gainsLoss = computeGainsLoss(holdings)

  const cards = [
    {
      key: 'gain',
      tablets: [
        moneyTablet(
          'Unrealized gain',
          summary.total_unrealized_gain,
          gainClassName(summary.total_unrealized_gain),
        ),
      ],
      icon: 'bi-graph-up-arrow',
      accent: 'mf-stat-accent-blue',
      ariaLabel: `Unrealized gain ${formatTradeValue(summary.total_unrealized_gain)}`,
    },
    {
      key: 'portfolio',
      tablets: [
        moneyTablet('Value', summary.total_current_value),
        moneyTablet('Invested', summary.total_invested),
      ],
      icon: 'bi-wallet2',
      accent: 'mf-stat-accent-blue',
      ariaLabel: `Current value ${formatTradeValue(summary.total_current_value)}, Total invested ${formatTradeValue(summary.total_invested)}`,
    },
    {
      key: 'returns',
      tablets: [
        {
          label: 'Gain',
          value: formatPctSigned(gainPct),
          valueClass: gainClassName(summary.total_unrealized_gain),
        },
        {
          label: 'XIRR',
          value: formatPercent(summary.xirr),
          valueClass: gainClassName(summary.xirr),
        },
      ],
      icon: 'bi-percent',
      accent: 'mf-stat-accent-amber',
      ariaLabel: `Gain ${formatPctSigned(gainPct)}, XIRR ${formatPercent(summary.xirr)}`,
    },
    ...(gainsLoss
      ? [
          {
            key: 'gains-loss',
            tablets: [
              moneyTablet('Gains', gainsLoss.gains, 'mf-stat-gain-positive'),
              moneyTablet('Loss', gainsLoss.loss, 'mf-stat-gain-negative'),
            ],
            icon: 'bi-bar-chart-steps',
            accent: 'mf-stat-accent-emerald',
            ariaLabel: `Gains ${formatTradeValue(gainsLoss.gains)}, Loss ${formatTradeValue(gainsLoss.loss)}`,
          },
        ]
      : []),
  ]

  return (
    <div className="mf-summary-grid">
      {cards.map((card) => (
        <div key={card.key} className={`mf-stat-card ${card.accent}`}>
          <div className="mf-stat-card-top mf-stat-card-top-icon-only">
            <span className="mf-stat-card-icon" aria-hidden="true">
              <BootstrapIcon icon={card.icon} />
            </span>
          </div>
          <div
            className="mf-stat-tablet-group"
            role="group"
            aria-label={card.ariaLabel}
          >
            {card.tablets.map((tablet) => (
              <div key={tablet.label} className="mf-stat-tablet">
                <span className="mf-stat-tablet-label">{tablet.label}</span>
                {tablet.tooltip ? (
                  <Tooltip label={tablet.tooltip} delayMs={400}>
                    <span
                      className={`mf-stat-tablet-value${tablet.money ? ' mf-stat-tablet-value-money' : ''} ${tablet.valueClass ?? ''}`}
                    >
                      {tablet.value}
                    </span>
                  </Tooltip>
                ) : (
                  <span
                    className={`mf-stat-tablet-value${tablet.money ? ' mf-stat-tablet-value-money' : ''} ${tablet.valueClass ?? ''}`}
                  >
                    {tablet.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default PortfolioSummaryCards
