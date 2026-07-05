import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatNav, formatTransactionDate } from '../../utils/mutualFundFormat'

const COMPACT = {
  width: 320,
  height: 168,
  pad: { top: 12, right: 12, bottom: 28, left: 44 },
  markerRadius: 3,
  axisFontSize: 9,
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MIN_VIEW_DAYS = 21
const ZOOM_FACTOR = 1.12

function buildPoints(navHistory) {
  return navHistory
    .map((point) => ({
      date: point.date,
      nav: Number(point.nav),
    }))
    .filter((point) => !Number.isNaN(point.nav))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function dateToMs(date) {
  return new Date(`${date}T00:00:00`).getTime()
}

function msToDate(ms) {
  const date = new Date(ms)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateToX(date, startDate, endDate, innerWidth, padLeft) {
  const start = dateToMs(startDate)
  const end = dateToMs(endDate)
  const current = dateToMs(date)
  if (end <= start) return padLeft + innerWidth / 2
  const ratio = Math.min(1, Math.max(0, (current - start) / (end - start)))
  return padLeft + ratio * innerWidth
}

function navToY(nav, minNav, maxNav, innerHeight, padTop) {
  if (maxNav === minNav) return padTop + innerHeight / 2
  const ratio = (nav - minNav) / (maxNav - minNav)
  return padTop + innerHeight - ratio * innerHeight
}

function getResponsivePadding(width, height) {
  return {
    top: Math.round(Math.max(20, height * 0.08)),
    right: Math.round(Math.max(16, width * 0.025)),
    bottom: Math.round(Math.max(40, height * 0.14)),
    left: Math.round(Math.max(64, width * 0.075)),
  }
}

function clampViewRange(startMs, endMs, fullStartMs, fullEndMs) {
  const fullSpan = fullEndMs - fullStartMs
  const minSpan = Math.min(fullSpan, MIN_VIEW_DAYS * MS_PER_DAY)
  let span = Math.max(minSpan, Math.min(endMs - startMs, fullSpan))
  let start = startMs
  let end = start + span

  if (start < fullStartMs) {
    start = fullStartMs
    end = fullStartMs + span
  }
  if (end > fullEndMs) {
    end = fullEndMs
    start = fullEndMs - span
  }

  return { startMs: start, endMs: end }
}

function useChartSize(containerRef, enabled) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!enabled || !containerRef.current) return undefined

    const node = containerRef.current

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(rect.height)
      if (width > 0 && height > 0) {
        setSize({ width, height })
      }
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    window.addEventListener('resize', updateSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [containerRef, enabled])

  return size
}

function HoldingNavChart({ chartData, size = 'compact' }) {
  const canvasRef = useRef(null)
  const panRef = useRef(null)
  const isLarge = size === 'large'
  const measured = useChartSize(canvasRef, isLarge)
  const [viewRange, setViewRange] = useState(null)
  const [isPanning, setIsPanning] = useState(false)

  const navPoints = useMemo(
    () => buildPoints(chartData?.nav_history ?? []),
    [chartData],
  )

  const markers = useMemo(() => {
    return (chartData?.transactions ?? []).map((txn) => ({
      ...txn,
      plotNav: Number(txn.nav),
    }))
  }, [chartData])

  const markerDates = useMemo(
    () => markers.map((marker) => marker.date).sort(),
    [markers],
  )

  const firstDate = navPoints[0]?.date || markerDates[0]
  const lastDate = navPoints[navPoints.length - 1]?.date || markerDates[markerDates.length - 1]
  const chartStart = chartData?.from_date || firstDate
  const chartEnd = chartData?.to_date || lastDate
  const fullStartMs = dateToMs(chartStart)
  const fullEndMs = dateToMs(chartEnd)

  useEffect(() => {
    setViewRange(null)
  }, [chartStart, chartEnd, chartData?.fund_name])

  const activeView = useMemo(() => {
    if (!viewRange) {
      return { startMs: fullStartMs, endMs: fullEndMs }
    }
    return clampViewRange(
      viewRange.startMs,
      viewRange.endMs,
      fullStartMs,
      fullEndMs,
    )
  }, [viewRange, fullStartMs, fullEndMs])

  const viewStartDate = msToDate(activeView.startMs)
  const viewEndDate = msToDate(activeView.endMs)

  const isZoomed =
    activeView.startMs > fullStartMs + MS_PER_DAY
    || activeView.endMs < fullEndMs - MS_PER_DAY

  const resetView = useCallback(() => {
    setViewRange(null)
  }, [])

  const handleWheel = useCallback(
    (event) => {
      if (!isLarge) return
      event.preventDefault()

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(rect.height)
      const pad = getResponsivePadding(width, height)
      const innerWidth = width - pad.left - pad.right
      if (innerWidth <= 0) return

      const pointerX = event.clientX - rect.left - pad.left
      const ratio = Math.min(1, Math.max(0, pointerX / innerWidth))
      const span = activeView.endMs - activeView.startMs
      const focus = activeView.startMs + ratio * span
      const zoomIn = event.deltaY < 0
      const nextSpan = zoomIn ? span / ZOOM_FACTOR : span * ZOOM_FACTOR
      const nextStart = focus - ratio * nextSpan
      const nextEnd = nextStart + nextSpan

      setViewRange(clampViewRange(nextStart, nextEnd, fullStartMs, fullEndMs))
    },
    [isLarge, activeView, fullStartMs, fullEndMs],
  )

  const handlePointerDown = useCallback(
    (event) => {
      if (!isLarge || event.button !== 0) return
      panRef.current = {
        startX: event.clientX,
        startMs: activeView.startMs,
        endMs: activeView.endMs,
      }
      setIsPanning(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [isLarge, activeView],
  )

  const handlePointerMove = useCallback(
    (event) => {
      if (!panRef.current || !isLarge) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(rect.height)
      const pad = getResponsivePadding(width, height)
      const innerWidth = width - pad.left - pad.right
      if (innerWidth <= 0) return

      const span = panRef.current.endMs - panRef.current.startMs
      const deltaMs = -((event.clientX - panRef.current.startX) / innerWidth) * span
      const nextStart = panRef.current.startMs + deltaMs
      const nextEnd = panRef.current.endMs + deltaMs

      setViewRange(clampViewRange(nextStart, nextEnd, fullStartMs, fullEndMs))
    },
    [isLarge, fullStartMs, fullEndMs],
  )

  const handlePointerUp = useCallback((event) => {
    panRef.current = null
    setIsPanning(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  useEffect(() => {
    if (!isLarge) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [isLarge, handleWheel])

  if (!navPoints.length && !markers.length) {
    return (
      <div className="mf-nav-chart-empty">
        NAV history is not available yet.
      </div>
    )
  }

  const width = isLarge ? measured.width : COMPACT.width
  const height = isLarge ? measured.height : COMPACT.height

  if (isLarge && (width === 0 || height === 0)) {
    return (
      <div className={`mf-nav-chart mf-nav-chart-${size}`}>
        {isLarge && (
          <div className="mf-nav-chart-toolbar">
            <span className="mf-nav-chart-hint">Scroll to zoom · Drag to pan</span>
          </div>
        )}
        <div ref={canvasRef} className="mf-nav-chart-canvas mf-nav-chart-canvas-interactive" />
      </div>
    )
  }

  const pad = isLarge ? getResponsivePadding(width, height) : COMPACT.pad
  const markerRadius = isLarge
    ? Math.max(2.5, Math.min(4, width / 220))
    : COMPACT.markerRadius
  const axisFontSize = isLarge
    ? Math.max(11, Math.min(13, width / 90))
    : COMPACT.axisFontSize
  const lineStrokeWidth = isLarge ? 2.5 : 2

  const innerWidth = width - pad.left - pad.right
  const innerHeight = height - pad.top - pad.bottom

  const visibleNavPoints = navPoints.filter(
    (point) => point.date >= viewStartDate && point.date <= viewEndDate,
  )
  const visibleMarkers = markers.filter(
    (marker) => marker.date >= viewStartDate && marker.date <= viewEndDate,
  )

  const navValues = visibleNavPoints.map((point) => point.nav)
  const markerNavs = visibleMarkers
    .map((marker) => marker.plotNav)
    .filter((value) => !Number.isNaN(value))
  const combinedNavs = [...navValues, ...markerNavs]
  const fallbackNavs = navPoints.map((point) => point.nav)
  const scaleNavs = combinedNavs.length ? combinedNavs : fallbackNavs
  const minNav = Math.min(...scaleNavs)
  const maxNav = Math.max(...scaleNavs)
  const navPadding = (maxNav - minNav) * 0.08 || maxNav * 0.02 || 1
  const yMin = minNav - navPadding
  const yMax = maxNav + navPadding

  const linePath = visibleNavPoints
    .map((point, index) => {
      const x = dateToX(point.date, viewStartDate, viewEndDate, innerWidth, pad.left)
      const y = navToY(point.nav, yMin, yMax, innerHeight, pad.top)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  const axisY = pad.top + innerHeight
  const dateLabelY = height - Math.round(pad.bottom * 0.35)
  const yLabelX = Math.round(pad.left * 0.12)
  const clipId = `mf-nav-clip-${chartData.fund_name.replace(/\W+/g, '-').slice(0, 24)}`

  return (
    <div className={`mf-nav-chart mf-nav-chart-${size}`}>
      {isLarge && (
        <div className="mf-nav-chart-toolbar">
          <span className="mf-nav-chart-hint">Scroll to zoom · Drag to pan</span>
          {isZoomed && (
            <button type="button" className="mf-nav-chart-reset" onClick={resetView}>
              Reset zoom
            </button>
          )}
        </div>
      )}
      <div
        ref={canvasRef}
        className={`mf-nav-chart-canvas${isLarge ? ' mf-nav-chart-canvas-interactive' : ''}${isPanning ? ' is-panning' : ''}`}
        onPointerDown={isLarge ? handlePointerDown : undefined}
        onPointerMove={isLarge ? handlePointerMove : undefined}
        onPointerUp={isLarge ? handlePointerUp : undefined}
        onPointerCancel={isLarge ? handlePointerUp : undefined}
      >
        <svg
          width={width}
          height={height}
          className="mf-nav-chart-svg"
          role="img"
          aria-label={`NAV chart for ${chartData.fund_name}`}
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x={pad.left}
                y={pad.top}
                width={innerWidth}
                height={innerHeight}
              />
            </clipPath>
          </defs>
          <line
            x1={pad.left}
            y1={axisY}
            x2={pad.left + innerWidth}
            y2={axisY}
            className="mf-nav-chart-axis"
          />
          <line
            x1={pad.left}
            y1={pad.top}
            x2={pad.left}
            y2={axisY}
            className="mf-nav-chart-axis"
          />
          <text
            x={pad.left}
            y={dateLabelY}
            className="mf-nav-chart-axis-label"
            fontSize={axisFontSize}
          >
            {formatTransactionDate(viewStartDate)}
          </text>
          <text
            x={pad.left + innerWidth}
            y={dateLabelY}
            textAnchor="end"
            className="mf-nav-chart-axis-label"
            fontSize={axisFontSize}
          >
            {formatTransactionDate(viewEndDate)}
          </text>
          <text
            x={yLabelX}
            y={pad.top + axisFontSize}
            className="mf-nav-chart-axis-label"
            fontSize={axisFontSize}
          >
            {formatNav(yMax)}
          </text>
          <text
            x={yLabelX}
            y={axisY}
            className="mf-nav-chart-axis-label"
            fontSize={axisFontSize}
          >
            {formatNav(yMin)}
          </text>
          <g clipPath={`url(#${clipId})`}>
            {visibleNavPoints.length > 0 && (
              <path
                d={linePath}
                className="mf-nav-chart-line"
                strokeWidth={lineStrokeWidth}
              />
            )}
            {visibleMarkers.map((marker, index) => {
              const x = dateToX(
                marker.date,
                viewStartDate,
                viewEndDate,
                innerWidth,
                pad.left,
              )
              const y = navToY(marker.plotNav, yMin, yMax, innerHeight, pad.top)
              const isBuy = marker.trade_type === 'IN'

              return (
                <g key={`${marker.date}-${marker.trade_type}-${index}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={markerRadius}
                    className={
                      isBuy ? 'mf-nav-chart-marker-buy' : 'mf-nav-chart-marker-sell'
                    }
                  />
                  <title>
                    {isBuy ? 'Buy' : 'Sell'} · {formatTransactionDate(marker.date)} ·{' '}
                    {formatNav(marker.nav)}
                  </title>
                </g>
              )
            })}
          </g>
        </svg>
      </div>
      <div className="mf-nav-chart-legend">
        <span className="mf-nav-chart-legend-item">
          <span className="mf-nav-chart-legend-line" aria-hidden="true" />
          NAV
        </span>
        <span className="mf-nav-chart-legend-item">
          <span className="mf-nav-chart-legend-dot mf-nav-chart-marker-buy" aria-hidden="true" />
          Buy
        </span>
        <span className="mf-nav-chart-legend-item">
          <span className="mf-nav-chart-legend-dot mf-nav-chart-marker-sell" aria-hidden="true" />
          Sell
        </span>
      </div>
    </div>
  )
}

export default HoldingNavChart
