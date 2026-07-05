import { formatPct } from '../../utils/mutualFundFormat'

function AssetMixRatioBar({ mix, ariaLabel }) {
  if (!mix) return null

  const { equityValue, debtValue, goldValue, equityPct, debtPct, goldPct } = mix

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
        {equityValue > 0 && (
          <div
            className="mf-ratio-bar-segment mf-ratio-bar-equity"
            style={{ flex: equityValue }}
          >
            {equityPct >= 5 && (
              <span className="mf-ratio-bar-label">{formatPct(equityPct, 0)}</span>
            )}
          </div>
        )}
        {debtValue > 0 && (
          <div
            className="mf-ratio-bar-segment mf-ratio-bar-debt"
            style={{ flex: debtValue }}
          >
            {debtPct >= 5 && (
              <span className="mf-ratio-bar-label">{formatPct(debtPct, 0)}</span>
            )}
          </div>
        )}
        {goldValue > 0 && (
          <div
            className="mf-ratio-bar-segment mf-ratio-bar-gold"
            style={{ flex: goldValue }}
          >
            {goldPct >= 5 && (
              <span className="mf-ratio-bar-label">{formatPct(goldPct, 0)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AssetMixRatioBar
