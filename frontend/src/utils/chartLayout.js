const WRAP_PADDING_Y = 16
const MIN_TAB_PANEL_HEIGHT = 200

export function computeChartPlotHeight(containerHeight) {
  return Math.max(MIN_TAB_PANEL_HEIGHT, containerHeight - WRAP_PADDING_Y)
}

/** @deprecated Use computeChartPlotHeight when controls live outside the chart wrap. */
export function computeTabPanelHeight(containerHeight, controlsHeight = 0) {
  return Math.max(
    MIN_TAB_PANEL_HEIGHT,
    containerHeight - WRAP_PADDING_Y - controlsHeight,
  )
}

export function estimateTabPanelHeight(containerHeight) {
  return computeChartPlotHeight(containerHeight)
}
