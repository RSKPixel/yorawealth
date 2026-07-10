import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useChartWidth } from '../../hooks/useChartWidth'
import { formatMonthLabel } from '../../utils/financialYear'
import { formatPct } from '../../utils/mutualFundFormat'

const MIN_CHART_HEIGHT = 200
const DEFAULT_HEADER_HEIGHT = 18

const SERIES = [
  {
    key: 'equity_pct',
    label: 'Equity',
    className: 'mf-asset-mix-chart-line-equity',
    pointClassName: 'mf-asset-mix-chart-point-equity',
    ohlcClassName: 'mf-asset-mix-chart-ohlc-equity',
  },
  {
    key: 'debt_pct',
    label: 'Debt',
    className: 'mf-asset-mix-chart-line-debt',
    pointClassName: 'mf-asset-mix-chart-point-debt',
    ohlcClassName: 'mf-asset-mix-chart-ohlc-debt',
  },
  {
    key: 'gold_pct',
    label: 'Gold',
    className: 'mf-asset-mix-chart-line-gold',
    pointClassName: 'mf-asset-mix-chart-point-gold',
    ohlcClassName: 'mf-asset-mix-chart-ohlc-gold',
  },
]

function buildTicks(min, max, count = 4) {
  if (min === max) {
    return [max]
  }

  const span = max - min
  const step = span / count
  const ticks = []
  for (let i = 0; i <= count; i += 1) {
    ticks.push(min + step * i)
  }
  return ticks
}

export function HoldingPctChart({ points, plotHeight }) {
  const headerRef = useRef(null)
  const canvasRef = useRef(null)
  const width = useChartWidth(canvasRef)
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT)
  const [hoverIndex, setHoverIndex] = useState(null)

  useLayoutEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight)
    }
  })

  const canvasHeight = Math.max(
    MIN_CHART_HEIGHT,
    (plotHeight ?? MIN_CHART_HEIGHT) - headerHeight,
  )

  const seriesPoints = useMemo(
    () =>
      points.filter(
        (point) =>
          Number.isFinite(point.equity_pct) &&
          Number.isFinite(point.debt_pct) &&
          Number.isFinite(point.gold_pct),
      ),
    [points],
  )

  useEffect(() => {
    setHoverIndex(null)
  }, [seriesPoints])

  if (!seriesPoints.length) {
    return (
      <div className="mf-net-chart-empty">
        Select Mutual Fund, Stocks, or PPF to see asset class holding %.
      </div>
    )
  }

  const yMin = 0
  const yMax = 100

  const padLeft = 56
  const padRight = 16
  const padTop = 10
  const padBottom = 28

  const xForIndex = (index, innerWidth) => {
    if (seriesPoints.length === 1) {
      return padLeft + innerWidth / 2
    }
    const ratio = index / (seriesPoints.length - 1)
    return padLeft + ratio * innerWidth
  }

  const yForValue = (value, innerHeight) => {
    if (yMax === yMin) return padTop + innerHeight / 2
    const ratio = (value - yMin) / (yMax - yMin)
    return padTop + innerHeight - ratio * innerHeight
  }

  const maxLabels = 8
  const labelStep = Math.max(1, Math.floor(seriesPoints.length / maxLabels))
  const xLabels = seriesPoints
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index % labelStep === 0 || index === seriesPoints.length - 1)

  if (width === 0) {
    return (
      <div
        className="mf-net-chart mf-progress-chart-plot"
        style={plotHeight ? { height: plotHeight } : undefined}
      >
        <div
          ref={canvasRef}
          className="mf-progress-chart-canvas mf-net-chart-canvas"
          style={{ height: canvasHeight }}
        />
      </div>
    )
  }

  const height = canvasHeight
  const innerWidth = width - padLeft - padRight
  const innerHeight = height - padTop - padBottom
  const yTicks = buildTicks(yMin, yMax, 4)
  const hoverPoint =
    hoverIndex != null && hoverIndex >= 0 && hoverIndex < seriesPoints.length
      ? seriesPoints[hoverIndex]
      : null
  const displayPoint = hoverPoint ?? seriesPoints[seriesPoints.length - 1]
  const hoverX = hoverPoint ? xForIndex(hoverIndex, innerWidth) : null

  const findNearestIndex = (clientX) => {
    const svg = canvasRef.current?.querySelector('svg')
    if (!svg || seriesPoints.length === 0) return null

    const rect = svg.getBoundingClientRect()
    const localX = clientX - rect.left
    let nearest = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    for (let index = 0; index < seriesPoints.length; index += 1) {
      const x = xForIndex(index, innerWidth)
      const distance = Math.abs(x - localX)
      if (distance < nearestDistance) {
        nearest = index
        nearestDistance = distance
      }
    }

    if (localX < padLeft - 24 || localX > padLeft + innerWidth + 24) {
      return null
    }

    return nearest
  }

  const handlePointerMove = (event) => {
    setHoverIndex(findNearestIndex(event.clientX))
  }

  const handlePointerLeave = () => {
    setHoverIndex(null)
  }

  return (
    <div
      className="mf-net-chart mf-progress-chart-plot"
      style={plotHeight ? { height: plotHeight } : undefined}
    >
      <div ref={headerRef} className="mf-progress-chart-header">
        <div className="mf-progress-chart-legend" aria-hidden="true">
          {SERIES.map((series) => (
            <span key={series.key} className="mf-progress-chart-legend-item">
              <span
                className={`mf-progress-chart-legend-swatch ${series.className}`}
              />
              {series.label}
            </span>
          ))}
        </div>

        {displayPoint && (
          <div className="mf-progress-chart-ohlc" role="status" aria-live="polite">
            <span className="mf-progress-chart-ohlc-month">
              {formatMonthLabel(displayPoint.month)}
            </span>
            {SERIES.map((series) => (
              <span key={series.key} className="mf-progress-chart-ohlc-item">
                <span className="mf-progress-chart-ohlc-sep">·</span>
                <span className="mf-progress-chart-ohlc-label">{series.label}</span>
                <span
                  className={`mf-progress-chart-ohlc-value ${series.ohlcClassName}`}
                >
                  {formatPct(displayPoint[series.key])}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        ref={canvasRef}
        className="mf-progress-chart-canvas"
        style={{ height: canvasHeight }}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
      >
        <svg
          className="mf-net-chart-svg"
          width={width}
          height={height}
          role="img"
          aria-label="Asset class holding percent over time"
        >
          <line
            x1={padLeft}
            y1={padTop + innerHeight}
            x2={padLeft + innerWidth}
            y2={padTop + innerHeight}
            className="mf-net-chart-axis"
          />
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={padTop + innerHeight}
            className="mf-net-chart-axis"
          />

          {yTicks.map((tick) => {
            const y = yForValue(tick, innerHeight)
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + innerWidth}
                  y2={y}
                  className="mf-net-chart-grid"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="mf-net-chart-axis-label"
                >
                  {formatPct(tick, 0)}
                </text>
              </g>
            )
          })}

          {SERIES.map((series) => {
            const pathD = seriesPoints
              .map((point, index) => {
                const x = xForIndex(index, innerWidth)
                const y = yForValue(point[series.key], innerHeight)
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
              })
              .join(' ')

            return (
              <path
                key={series.key}
                d={pathD}
                className={`mf-progress-chart-line ${series.className}`}
              />
            )
          })}

          {hoverPoint && hoverX != null && (
            <line
              x1={hoverX}
              y1={padTop}
              x2={hoverX}
              y2={padTop + innerHeight}
              className="mf-progress-chart-hover-line"
            />
          )}

          {seriesPoints.map((point, index) => {
            const x = xForIndex(index, innerWidth)
            const isActive = hoverIndex === index
            return (
              <g key={point.month}>
                {SERIES.map((series) => {
                  const y = yForValue(point[series.key], innerHeight)
                  return (
                    <circle
                      key={`${point.month}-${series.key}`}
                      cx={x}
                      cy={y}
                      r={isActive ? 4.5 : 3}
                      className={`mf-progress-chart-point ${series.pointClassName}${
                        isActive ? ' mf-progress-chart-point-active' : ''
                      }`}
                    />
                  )
                })}
              </g>
            )
          })}

          {xLabels.map(({ point, index }) => {
            const x = xForIndex(index, innerWidth)
            return (
              <text
                key={`x-${point.month}`}
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="mf-net-chart-axis-label"
              >
                {formatMonthLabel(point.month)}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default HoldingPctChart
