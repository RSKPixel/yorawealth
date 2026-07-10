import {
  CHART_TABS,
  PORTFOLIO_OPTIONS,
  TIME_RANGE_OPTIONS,
} from '../../hooks/useOverviewCharts'

function OverviewChartControls({
  activeTab,
  onTabChange,
  selectedIds,
  onTogglePortfolio,
  selectedRange,
  onRangeChange,
  benchmarkOptions = [],
  selectedBenchmarkId,
  onBenchmarkChange,
  isBenchmarksLoading = false,
}) {
  return (
    <>
      <div
        className="st-segmented-control st-segmented-control--chart-type mf-overview-chart-type-control"
        role="tablist"
        aria-label="Chart type"
      >
        {CHART_TABS.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-variant="segmented_control"
              data-selected={isActive ? true : undefined}
              className="st-segmented-control-option"
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

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
                onClick={() => onTogglePortfolio(option.id)}
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
                onClick={() => onRangeChange(option.id)}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'progress' &&
          (benchmarkOptions.length > 0 || isBenchmarksLoading) && (
          <select
            className="mf-progress-chart-benchmark-select"
            value={selectedBenchmarkId}
            onChange={(event) => onBenchmarkChange(event.target.value)}
            aria-label="Compare with"
            disabled={isBenchmarksLoading}
            aria-busy={isBenchmarksLoading}
          >
            <option value="">—</option>
            {benchmarkOptions.map((benchmark) => (
              <option key={benchmark.id} value={benchmark.id}>
                {benchmark.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </>
  )
}

export default OverviewChartControls
