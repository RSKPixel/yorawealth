import DrawdownLineChart from './DrawdownChart'
import HoldingPctChart from './HoldingPctChart'
import ProgressLineChart from './InvestmentProgressChart'
import ProfitLossPctChart from './ProfitLossPctChart'

function OverviewChartsPanel({
  activeTab,
  activeTabLabel,
  filteredPoints,
  progressChartPoints,
  benchmarkLabel,
  drawdownPoints,
  profitLossPctPoints,
  holdingPctPoints,
  plotHeight,
}) {
  let chart = null

  if (activeTab === 'progress') {
    chart = (
      <ProgressLineChart
        points={progressChartPoints}
        plotHeight={plotHeight}
        benchmarkLabel={benchmarkLabel}
      />
    )
  } else if (activeTab === 'pl_pct') {
    chart = (
      <ProfitLossPctChart points={profitLossPctPoints} plotHeight={plotHeight} />
    )
  } else if (activeTab === 'holding_pct') {
    chart = <HoldingPctChart points={holdingPctPoints} plotHeight={plotHeight} />
  } else {
    chart = <DrawdownLineChart points={drawdownPoints} plotHeight={plotHeight} />
  }

  return (
    <div
      className="mf-progress-chart-tabpanel"
      role="tabpanel"
      style={{ height: plotHeight }}
      aria-label={activeTabLabel}
    >
      {chart}
    </div>
  )
}

export default OverviewChartsPanel
