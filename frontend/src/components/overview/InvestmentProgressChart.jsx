import { useEffect, useMemo, useRef, useState } from 'react'
import { formatMonthLabel } from '../../utils/financialYear'
import { formatTradeValue, formatTradeValueCompact } from '../../utils/mutualFundFormat'

const CHART_HEIGHT = 240
const CHART_START_MONTH = '2022-01'

const PORTFOLIO_OPTIONS = [
  { id: 'mf', label: 'Mutual Fund' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'ppf', label: 'PPF' },
]

const TIME_RANGE_OPTIONS = [
  { id: '3m', label: '3M', months: 3 },
  { id: '1y', label: '1Y', months: 12 },
  { id: '2y', label: '2Y', months: 24 },
  { id: '3y', label: '3Y', months: 36 },
  { id: '5y', label: '5Y', months: 60 },
  { id: 'all', label: 'All', months: null },
]

const SERIES = [
  {
    key: 'invested_value',
    label: 'Invested',
    className: 'mf-progress-chart-line-invested',
    pointClassName: 'mf-progress-chart-point-invested',
  },
  {
    key: 'current_value',
    label: 'Current value',
    className: 'mf-progress-chart-line-value',
    pointClassName: 'mf-progress-chart-point-value',
  },
]

function getExtent(values) {
  if (!values.length) return { min: 0, max: 0 }
  let min = values[0]
  let max = values[0]
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }
  return { min, max }
}

function buildTicks(min, max, count = 3) {
  if (min === max) {
    if (min === 0) return [0]
    return [min, 0].sort((a, b) => a - b)
  }

  const span = max - min
  const step = span / count
  const ticks = []
  for (let i = 0; i <= count; i += 1) {
    ticks.push(min + step * i)
  }
  return ticks
}

function enumerateMonths(startMonth, endMonth) {
  const months = []
  let year = Number(startMonth.slice(0, 4))
  let month = Number(startMonth.slice(5, 7))
  const endYear = Number(endMonth.slice(0, 4))
  const endMonthNum = Number(endMonth.slice(5, 7))

  while (year < endYear || (year === endYear && month <= endMonthNum)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return months
}

function mergePortfolioSeries(seriesByPortfolio, selectedIds) {
  const byMonth = new Map()

  for (const id of selectedIds) {
    const points = seriesByPortfolio?.[id] ?? []
    for (const point of points) {
      const existing = byMonth.get(point.month)
      if (!existing) {
        byMonth.set(point.month, {
          month: point.month,
          invested_value: Number(point.invested_value) || 0,
          current_value: Number(point.current_value) || 0,
        })
        continue
      }

      existing.invested_value += Number(point.invested_value) || 0
      existing.current_value += Number(point.current_value) || 0
    }
  }

  if (byMonth.size === 0) {
    return []
  }

  const endMonth = [...byMonth.keys()].sort().at(-1)
  const months = enumerateMonths(CHART_START_MONTH, endMonth)

  return months.map(
    (month) =>
      byMonth.get(month) ?? {
        month,
        invested_value: 0,
        current_value: 0,
      },
  )
}

function filterPointsByRange(points, rangeId) {
  if (!points.length) {
    return []
  }

  const option = TIME_RANGE_OPTIONS.find((entry) => entry.id === rangeId)
  if (!option || option.months == null) {
    return points.filter((point) => point.month >= CHART_START_MONTH)
  }

  return points.slice(-option.months)
}

function useChartWidth(containerRef) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return undefined

    const node = containerRef.current

    const updateWidth = () => {
      const rect = node.getBoundingClientRect()
      const nextWidth = Math.floor(rect.width)
      if (nextWidth > 0) {
        setWidth(nextWidth)
      }
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)
    window.addEventListener('resize', updateWidth)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [containerRef])

  return width
}

function ProgressLineChart({ points }) {
  const containerRef = useRef(null)
  const width = useChartWidth(containerRef)
  const [hoverIndex, setHoverIndex] = useState(null)

  const seriesPoints = useMemo(
    () =>
      points.filter(
        (point) =>
          Number.isFinite(point.invested_value) &&
          Number.isFinite(point.current_value),
      ),
    [points],
  )

  useEffect(() => {
    setHoverIndex(null)
  }, [seriesPoints])

  if (!seriesPoints.length) {
    return (
      <div className="mf-net-chart-empty">
        Select Mutual Fund, Stocks, or PPF to see progress.
      </div>
    )
  }

  const allValues = seriesPoints.flatMap((point) => [
    point.invested_value,
    point.current_value,
  ])
  const { min, max } = getExtent(allValues)
  const paddedSpan = max === min ? Math.abs(max || 1) : max - min
  const padding = paddedSpan * 0.08 || 1
  const yMin = min - padding
  const yMax = max + padding

  const padLeft = 72
  const padRight = 16
  const padTop = 16
  const padBottom = 40

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
      <div ref={containerRef} className="mf-net-chart mf-net-chart-canvas" />
    )
  }

  const height = CHART_HEIGHT
  const innerWidth = width - padLeft - padRight
  const innerHeight = height - padTop - padBottom
  const yTicks = buildTicks(yMin, yMax, 3)
  const hoverPoint =
    hoverIndex != null && hoverIndex >= 0 && hoverIndex < seriesPoints.length
      ? seriesPoints[hoverIndex]
      : null
  const displayPoint = hoverPoint ?? seriesPoints[seriesPoints.length - 1]
  const hoverX = hoverPoint ? xForIndex(hoverIndex, innerWidth) : null

  const findNearestIndex = (clientX) => {
    const svg = containerRef.current?.querySelector('svg')
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

    // Ignore pointer far outside the plot area
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
    <div ref={containerRef} className="mf-net-chart mf-progress-chart-plot">
      <div className="mf-progress-chart-header">
        <div className="mf-progress-chart-legend" aria-hidden="true">
          {SERIES.map((series) => (
            <span key={series.key} className="mf-progress-chart-legend-item">
              <span className={`mf-progress-chart-legend-swatch ${series.className}`} />
              {series.label}
            </span>
          ))}
        </div>

        {displayPoint && (
          <div className="mf-progress-chart-ohlc" role="status" aria-live="polite">
            <span className="mf-progress-chart-ohlc-month">
              {formatMonthLabel(displayPoint.month)}
            </span>
            <span className="mf-progress-chart-ohlc-sep">·</span>
            <span className="mf-progress-chart-ohlc-item">
              <span className="mf-progress-chart-ohlc-label">Inv</span>
              <span className="mf-progress-chart-ohlc-value mf-progress-chart-ohlc-value-invested">
                {formatTradeValue(displayPoint.invested_value)}
              </span>
            </span>
            <span className="mf-progress-chart-ohlc-sep">·</span>
            <span className="mf-progress-chart-ohlc-item">
              <span className="mf-progress-chart-ohlc-label">Val</span>
              <span className="mf-progress-chart-ohlc-value mf-progress-chart-ohlc-value-current">
                {formatTradeValue(displayPoint.current_value)}
              </span>
            </span>
          </div>
        )}
      </div>

      <div
        className="mf-progress-chart-canvas"
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
      >
        <svg
          className="mf-net-chart-svg"
          width={width}
          height={height}
          role="img"
          aria-label="Investment progress over time"
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
                  {formatTradeValueCompact(tick)}
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

function InvestmentProgressChart({ seriesByPortfolio }) {
  const optionsWithData = useMemo(
    () =>
      PORTFOLIO_OPTIONS.filter(
        (option) => (seriesByPortfolio?.[option.id]?.length ?? 0) > 0,
      ),
    [seriesByPortfolio],
  )

  const [selectedIds, setSelectedIds] = useState(() =>
    PORTFOLIO_OPTIONS.map((option) => option.id),
  )
  const [selectedRange, setSelectedRange] = useState('1y')

  useEffect(() => {
    if (optionsWithData.length === 0) {
      return
    }

    setSelectedIds((current) => {
      const available = new Set(optionsWithData.map((option) => option.id))
      const next = current.filter((id) => available.has(id))
      if (next.length > 0) {
        return next
      }
      return optionsWithData.map((option) => option.id)
    })
  }, [optionsWithData])

  const activePoints = useMemo(
    () => mergePortfolioSeries(seriesByPortfolio, selectedIds),
    [seriesByPortfolio, selectedIds],
  )

  const filteredPoints = useMemo(
    () => filterPointsByRange(activePoints, selectedRange),
    [activePoints, selectedRange],
  )

  const togglePortfolio = (id) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id)
      }
      return [...current, id]
    })
  }

  return (
    <div className="mf-progress-chart-panel">
      <div className="mf-progress-chart-toolbar">
        <div
          className="st-segmented-control"
          role="group"
          aria-label="Select portfolios"
        >
          {PORTFOLIO_OPTIONS.map((option) => {
            const isSelected = selectedIds.includes(option.id)

            return (
              <button
                key={option.id}
                type="button"
                data-variant="segmented_control"
                data-selected={isSelected ? true : undefined}
                aria-pressed={isSelected}
                className="st-segmented-control-option"
                onClick={() => togglePortfolio(option.id)}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <div
          className="st-segmented-control st-segmented-control--period mf-progress-chart-range-control"
          role="group"
          aria-label="Select time range"
        >
          {TIME_RANGE_OPTIONS.map((option) => {
            const isSelected = selectedRange === option.id

            return (
              <button
                key={option.id}
                type="button"
                data-variant="segmented_control"
                data-selected={isSelected ? true : undefined}
                aria-pressed={isSelected}
                className="st-segmented-control-option"
                onClick={() => setSelectedRange(option.id)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mf-progress-chart-tabpanel">
        <ProgressLineChart points={filteredPoints} />
      </div>
    </div>
  )
}

export default InvestmentProgressChart
