import Tooltip from './Tooltip'
import { formatPct, formatTradeValue } from '../../utils/mutualFundFormat'

function segmentAriaLabel(label, invested, value) {
  return `${label}: Invested ${formatTradeValue(invested)}, Value ${formatTradeValue(value)}`
}

function SegmentTooltipContent({ label, invested, value, tone }) {
  return (
    <div className={`mf-ratio-tooltip mf-ratio-tooltip-${tone}`}>
      <div className="mf-ratio-tooltip-title">{label}</div>
      <div className="mf-ratio-tooltip-row">
        <span className="mf-ratio-tooltip-key">Invested</span>
        <span className="mf-ratio-tooltip-val">{formatTradeValue(invested)}</span>
      </div>
      <div className="mf-ratio-tooltip-row">
        <span className="mf-ratio-tooltip-key">Value</span>
        <span className="mf-ratio-tooltip-val">{formatTradeValue(value)}</span>
      </div>
    </div>
  )
}

function AssetMixRatioBar({ mix, ariaLabel }) {
  if (!mix) return null

  const {
    equityValue,
    debtValue,
    goldValue,
    equityPct,
    debtPct,
    goldPct,
    equityInvested = 0,
    debtInvested = 0,
    goldInvested = 0,
  } = mix

  const segments = [
    {
      key: 'equity',
      label: 'Equity',
      tone: 'equity',
      value: equityValue,
      invested: equityInvested,
      pct: equityPct,
      className: 'mf-ratio-bar-equity',
    },
    {
      key: 'debt',
      label: 'Debt',
      tone: 'debt',
      value: debtValue,
      invested: debtInvested,
      pct: debtPct,
      className: 'mf-ratio-bar-debt',
    },
    {
      key: 'gold',
      label: 'Gold',
      tone: 'gold',
      value: goldValue,
      invested: goldInvested,
      pct: goldPct,
      className: 'mf-ratio-bar-gold',
    },
  ].filter((segment) => segment.value > 0)

  return (
    <div
      className="mf-stat-tablet-group mf-stat-bar-group"
      role="group"
      aria-label={ariaLabel}
    >
      <div className="mf-stat-bar-legend">
        <span className="mf-ratio-legend-equity">Equity</span>
        <span className="mf-mix-type-sep" aria-hidden="true">
          ·
        </span>
        <span className="mf-ratio-legend-debt">Debt</span>
        <span className="mf-mix-type-sep" aria-hidden="true">
          ·
        </span>
        <span className="mf-ratio-legend-gold">Gold</span>
      </div>
      <div className="mf-ratio-bar mf-ratio-bar-in-tablet">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="mf-ratio-bar-segment-wrap"
            style={{ flex: segment.value }}
          >
            <Tooltip
              variant="card"
              placement="top"
              delayMs={150}
              label={
                <SegmentTooltipContent
                  label={segment.label}
                  invested={segment.invested}
                  value={segment.value}
                  tone={segment.tone}
                />
              }
            >
              <div
                className={`mf-ratio-bar-segment ${segment.className}`}
                aria-label={segmentAriaLabel(
                  segment.label,
                  segment.invested,
                  segment.value,
                )}
              >
                {segment.pct >= 5 && (
                  <span className="mf-ratio-bar-label">
                    {formatPct(segment.pct, 0)}
                  </span>
                )}
              </div>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AssetMixRatioBar
