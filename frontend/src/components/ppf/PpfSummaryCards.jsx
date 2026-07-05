import BootstrapIcon from '../icons/BootstrapIcon'
import Tooltip from '../common/Tooltip'
import {
  formatPercent,
  formatTradeValue,
  formatTradeValueCompact,
  formatTradeValueInMillions,
  formatTradeValueTooltip,
} from '../../utils/mutualFundFormat'

function gainClassName(value) {
  if (value > 0) return 'mf-stat-gain-positive'
  if (value < 0) return 'mf-stat-gain-negative'
  return 'mf-stat-gain-neutral'
}

function PpfSummaryCards({ summary, investments }) {
  if (!summary) return null

  const primaryAccount = investments?.[0]

  const cards = [
    {
      key: 'balance',
      tablets: [
        {
          label: 'Current balance',
          value: formatTradeValueInMillions(summary.total_balance),
          tooltip: formatTradeValue(summary.total_balance),
          money: true,
        },
      ],
      icon: 'bi-wallet2',
      accent: 'mf-stat-accent-amber',
      ariaLabel: `Current balance ${formatTradeValue(summary.total_balance)}`,
    },
    {
      key: 'deposits',
      tablets: [
        {
          label: 'Deposited',
          value: formatTradeValueInMillions(summary.total_deposited),
          tooltip: formatTradeValue(summary.total_deposited),
          money: true,
        },
        {
          label: 'Withdrawn',
          value: formatTradeValueInMillions(summary.total_withdrawn),
          tooltip: formatTradeValue(summary.total_withdrawn),
          money: true,
        },
      ],
      icon: 'bi-arrow-down-up',
      accent: 'mf-stat-accent-teal',
      ariaLabel: `Deposited ${formatTradeValue(summary.total_deposited)}, Withdrawn ${formatTradeValue(summary.total_withdrawn)}`,
    },
    {
      key: 'returns',
      tablets: [
        {
          label: 'Interest earned',
          value: formatTradeValueCompact(summary.total_interest),
          tooltip: formatTradeValueTooltip(summary.total_interest),
          money: true,
          valueClass: 'mf-stat-gain-positive',
        },
        {
          label: 'XIRR',
          value: formatPercent(summary.xirr),
          valueClass: gainClassName(summary.xirr),
        },
      ],
      icon: 'bi-percent',
      accent: 'mf-stat-accent-violet',
      ariaLabel: `Interest earned ${formatTradeValue(summary.total_interest)}, XIRR ${formatPercent(summary.xirr)}`,
    },
    ...(primaryAccount
      ? [
          {
            key: 'account',
            tablets: [
              {
                label: 'Account',
                value: primaryAccount.account_number,
              },
            ],
            icon: 'bi-bank',
            accent: 'mf-stat-accent-teal',
            ariaLabel: `Account ${primaryAccount.account_number}`,
          },
        ]
      : []),
  ]

  return (
    <div className="mf-summary-grid">
      {cards.map((card) => (
        <div key={card.key} className={`mf-stat-card ${card.accent}`}>
          <div className={`mf-stat-card-top${card.tablets ? ' mf-stat-card-top-icon-only' : ''}`}>
            <span className="mf-stat-card-icon" aria-hidden="true">
              <BootstrapIcon icon={card.icon} />
            </span>
          </div>
          <div className="mf-stat-tablet-group" role="group" aria-label={card.ariaLabel}>
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

export default PpfSummaryCards
