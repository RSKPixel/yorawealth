import MetricPctLineChart from './MetricPctLineChart'

export function ProfitLossPctChart({ points, plotHeight }) {
  return (
    <MetricPctLineChart
      points={points}
      plotHeight={plotHeight}
      label="P/L %"
      legendSwatchClass="mf-profit-loss-pct-chart-legend-swatch"
      lineClass="mf-profit-loss-pct-chart-line"
      pointClass="mf-profit-loss-pct-chart-point"
      emptyMessage="Select Mutual Fund, Stocks, or PPF to see profit and loss %."
      ariaLabel="Profit and loss percent over time"
    />
  )
}

export default ProfitLossPctChart
