import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useChartWidth } from '../../hooks/useChartWidth'
import { formatMonthLabel } from '../../utils/financialYear'
import { formatPctSigned } from '../../utils/mutualFundFormat'

const MIN_CHART_HEIGHT = 200
const DEFAULT_HEADER_HEIGHT = 18

function buildTicks(min, max, count = 3) {
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

export function DrawdownLineChart({ points, plotHeight }) {
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
      points.filter((point) => Number.isFinite(point.drawdown_pct)),
    [points],
  )

  useEffect(() => {
    setHoverIndex(null)
  }, [seriesPoints])

  if (!seriesPoints.length) {
    return (
      <div className="mf-net-chart-empty">
        Select Mutual Fund, Stocks, or PPF to see drawdown.
      </div>
    )
  }

  const drawdownValues = seriesPoints.map((point) => point.drawdown_pct)
  const minDrawdown = Math.min(...drawdownValues, 0)
  const padding = Math.abs(minDrawdown) * 0.08 || 1
  const yMin = minDrawdown - padding
  const yMax = 0

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
  const yTicks = buildTicks(yMin, yMax, 3)
  const zeroY = yForValue(0, innerHeight)
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

  const pathD = seriesPoints
    .map((point, index) => {
      const x = xForIndex(index, innerWidth)
      const y = yForValue(point.drawdown_pct, innerHeight)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  return (
    <div
      className="mf-net-chart mf-progress-chart-plot"
      style={plotHeight ? { height: plotHeight } : undefined}
    >
      <div ref={headerRef} className="mf-progress-chart-header">
        <div className="mf-progress-chart-legend" aria-hidden="true">
          <span className="mf-progress-chart-legend-item">
            <span className="mf-progress-chart-legend-swatch mf-drawdown-chart-legend-swatch" />
            Drawdown
          </span>
          <span className="mf-progress-chart-legend-item">
            <span className="mf-progress-chart-legend-swatch mf-drawdown-chart-signal-swatch" />
            −5% vs 3M avg
          </span>
        </div>

        {displayPoint && (
          <div className="mf-progress-chart-ohlc" role="status" aria-live="polite">
            <span className="mf-progress-chart-ohlc-month">
              {formatMonthLabel(displayPoint.month)}
            </span>
            <span className="mf-progress-chart-ohlc-sep">·</span>
            <span className="mf-progress-chart-ohlc-item">
              <span className="mf-progress-chart-ohlc-label">P/L%</span>
              <span className="mf-progress-chart-ohlc-value">
                {formatPctSigned(displayPoint.profit_pct)}
              </span>
            </span>
            <span className="mf-progress-chart-ohlc-sep">·</span>
            <span className="mf-progress-chart-ohlc-item">
              <span className="mf-progress-chart-ohlc-label">Peak</span>
              <span className="mf-progress-chart-ohlc-value">
                {formatPctSigned(displayPoint.peak_profit_pct)}
              </span>
            </span>
            <span className="mf-progress-chart-ohlc-sep">·</span>
            <span className="mf-progress-chart-ohlc-item">
              <span className="mf-progress-chart-ohlc-label">DD</span>
              <span className="mf-progress-chart-ohlc-value mf-drawdown-chart-ohlc-value">
                {formatPctSigned(displayPoint.drawdown_pct)}
              </span>
            </span>
            {Number.isFinite(displayPoint.drawdown_ma) && (
              <>
                <span className="mf-progress-chart-ohlc-sep">·</span>
                <span className="mf-progress-chart-ohlc-item">
                  <span className="mf-progress-chart-ohlc-label">3M avg</span>
                  <span className="mf-progress-chart-ohlc-value">
                    {formatPctSigned(displayPoint.drawdown_ma)}
                  </span>
                </span>
              </>
            )}
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
          aria-label="Profit drawdown over time"
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
                  {formatPctSigned(tick)}
                </text>
              </g>
            )
          })}

          <line
            x1={padLeft}
            y1={zeroY}
            x2={padLeft + innerWidth}
            y2={zeroY}
            className="mf-drawdown-chart-zero-line"
          />

          <path d={pathD} className="mf-progress-chart-line mf-drawdown-chart-line" />

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
            const y = yForValue(point.drawdown_pct, innerHeight)
            const isActive = hoverIndex === index
            const isSignal = Boolean(point.drawdown_ma_signal)
            return (
              <g key={point.month}>
                {isSignal && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isActive ? 8 : 7}
                    className="mf-drawdown-chart-signal-ring"
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={isSignal ? (isActive ? 5 : 4.5) : isActive ? 4.5 : 3}
                  className={`mf-progress-chart-point mf-drawdown-chart-point${
                    isSignal ? ' mf-drawdown-chart-point-signal' : ''
                  }${isActive ? ' mf-progress-chart-point-active' : ''}`}
                />
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

export default DrawdownLineChart
