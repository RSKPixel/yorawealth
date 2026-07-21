import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchPortfolioHoldings as fetchMutualFundHoldings,
} from '../api/mutualFund'
import { fetchInvestmentProgress, fetchInvestmentProgressBenchmarks } from '../api/overview'
import { fetchPpfInvestments } from '../api/ppf'
import { fetchStockHoldings } from '../api/stocks'
import OverviewEmptyState from '../components/overview/OverviewEmptyState'
import OverviewSummaryCards from '../components/overview/OverviewSummaryCards'
import PortfolioBreakdownStrip from '../components/overview/PortfolioBreakdownStrip'
import OverviewChartsPanel from '../components/overview/OverviewChartsPanel'
import OverviewChartControls from '../components/overview/OverviewChartControls'
import PortfolioPageHeader from '../components/layout/PortfolioPageHeader'
import { useOverviewCharts } from '../hooks/useOverviewCharts'
import { useViewportChartHeight } from '../hooks/useViewportChartHeight'
import { useToast } from '../context/ToastContext'
import { getApiErrorMessage } from '../utils/apiErrors'
import { aggregateSummary, hasAnyPortfolioData } from '../utils/overviewAggregate'
import { computeChartPlotHeight, estimateTabPanelHeight } from '../utils/chartLayout'
import { ppfToSummaryPart } from '../utils/ppfOverview'

const EMPTY_PROGRESS = {
  mf: [],
  stocks: [],
  ppf: [],
}

const EMPTY_SUMMARY = {
  total_invested: 0,
  total_current_value: 0,
  total_unrealized_gain: 0,
  xirr: null,
}

function DashboardPage() {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [mfHoldings, setMfHoldings] = useState([])
  const [mfSummary, setMfSummary] = useState(EMPTY_SUMMARY)
  const [stockHoldings, setStockHoldings] = useState([])
  const [stockSummary, setStockSummary] = useState(EMPTY_SUMMARY)
  const [ppfInvestments, setPpfInvestments] = useState([])
  const [ppfSummary, setPpfSummary] = useState(null)
  const [investmentProgress, setInvestmentProgress] = useState(EMPTY_PROGRESS)
  const [benchmarkSeries, setBenchmarkSeries] = useState([])
  const [isProgressLoading, setIsProgressLoading] = useState(false)
  const [isBenchmarksLoading, setIsBenchmarksLoading] = useState(false)
  const [chartWrapRef, chartMinHeight] = useViewportChartHeight({
    layoutKey: isProgressLoading,
  })
  const chartPlotHeight = computeChartPlotHeight(chartMinHeight)
  const overviewCharts = useOverviewCharts(investmentProgress, benchmarkSeries, {
    mf: mfSummary.total_unrealized_gain,
    stocks: stockSummary.total_unrealized_gain,
    ppf: ppfSummary?.total_unrealized_gain ?? 0,
  })

  const loadOverviewData = useCallback(async () => {
    setIsLoading(true)

    const [mfOutcome, stocksOutcome, ppfOutcome] = await Promise.allSettled([
      fetchMutualFundHoldings(),
      fetchStockHoldings(),
      fetchPpfInvestments(),
    ])

    const errors = []

    if (mfOutcome.status === 'fulfilled') {
      const mfResult = mfOutcome.value
      setMfHoldings(mfResult.holdings ?? [])
      setMfSummary({
        total_invested: mfResult.total_invested ?? 0,
        total_current_value: mfResult.total_current_value ?? 0,
        total_unrealized_gain: mfResult.total_unrealized_gain ?? 0,
        xirr: mfResult.xirr ?? null,
      })
    } else {
      setMfHoldings([])
      setMfSummary(EMPTY_SUMMARY)
      errors.push(getApiErrorMessage(mfOutcome.reason, 'Unable to load mutual fund data.'))
    }

    if (stocksOutcome.status === 'fulfilled') {
      const stocksResult = stocksOutcome.value
      setStockHoldings(stocksResult.holdings ?? [])
      setStockSummary({
        total_invested: stocksResult.total_invested ?? 0,
        total_current_value: stocksResult.total_current_value ?? 0,
        total_unrealized_gain: stocksResult.total_unrealized_gain ?? 0,
        xirr: stocksResult.xirr ?? null,
      })
    } else {
      setStockHoldings([])
      setStockSummary(EMPTY_SUMMARY)
      errors.push(getApiErrorMessage(stocksOutcome.reason, 'Unable to load stock data.'))
    }

    if (ppfOutcome.status === 'fulfilled') {
      const ppfResult = ppfOutcome.value
      setPpfInvestments(ppfResult.investments ?? [])
      setPpfSummary(ppfToSummaryPart(ppfResult))
    } else {
      setPpfInvestments([])
      setPpfSummary(null)
    }

    if (errors.length > 0) {
      showToast(errors[0])
    }

    setIsLoading(false)
  }, [showToast])

  const loadInvestmentProgress = useCallback(async () => {
    setIsProgressLoading(true)
    setBenchmarkSeries([])
    setIsBenchmarksLoading(true)

    try {
      const progressResult = await fetchInvestmentProgress()
      setInvestmentProgress({
        mf: progressResult.mf ?? [],
        stocks: progressResult.stocks ?? [],
        ppf: progressResult.ppf ?? [],
      })
    } catch (error) {
      setInvestmentProgress(EMPTY_PROGRESS)
      setBenchmarkSeries([])
      setIsBenchmarksLoading(false)
      showToast(
        getApiErrorMessage(error, 'Unable to load investment progress.'),
      )
      return
    } finally {
      setIsProgressLoading(false)
    }

    fetchInvestmentProgressBenchmarks()
      .then((result) => {
        setBenchmarkSeries(result.benchmarks ?? [])
      })
      .catch(() => {
        setBenchmarkSeries([])
      })
      .finally(() => {
        setIsBenchmarksLoading(false)
      })
  }, [showToast])

  const summary = useMemo(
    () =>
      aggregateSummary(
        [mfSummary, stockSummary, ppfSummary].filter(Boolean),
      ),
    [mfSummary, ppfSummary, stockSummary],
  )

  const hasPortfolioData = hasAnyPortfolioData({
    mfHoldings,
    stockHoldings,
    ppfInvestments,
    mfSummary,
    stockSummary,
    ppfSummary,
    summary,
  })

  useEffect(() => {
    loadOverviewData()
  }, [loadOverviewData])

  useEffect(() => {
    if (isLoading || !hasPortfolioData) {
      return
    }

    loadInvestmentProgress()
  }, [hasPortfolioData, isLoading, loadInvestmentProgress])

  const ppfCurrentValue = ppfSummary?.total_current_value ?? 0
  const ppfInvested = ppfSummary?.total_invested ?? 0

  const hasInvestmentProgress = useMemo(
    () => Object.values(investmentProgress).some((points) => points.length > 0),
    [investmentProgress],
  )

  const portfolios = useMemo(
    () => [
      {
        key: 'mf',
        label: 'Mutual Fund',
        path: '/mutual-fund',
        tone: 'equity',
        fillTone: 'equity',
        value: mfSummary?.total_current_value ?? 0,
        count: mfHoldings.length,
        countLabel: mfHoldings.length === 1 ? 'fund' : 'funds',
      },
      {
        key: 'stocks',
        label: 'Stocks',
        path: '/stocks',
        tone: 'debt',
        fillTone: 'debt',
        value: stockSummary?.total_current_value ?? 0,
        count: stockHoldings.length,
        countLabel: stockHoldings.length === 1 ? 'stock' : 'stocks',
      },
      {
        key: 'ppf',
        label: 'Public Provident Fund',
        path: '/ppf',
        tone: 'debt',
        fillTone: 'debt',
        value: ppfCurrentValue,
        count: ppfInvestments.length,
        countLabel: ppfInvestments.length === 1 ? 'account' : 'accounts',
      },
    ],
    [
      mfHoldings.length,
      mfSummary,
      ppfCurrentValue,
      ppfInvestments.length,
      stockHoldings.length,
      stockSummary,
    ],
  )

  return (
    <div className="mf-page overview-page mf-page-layout">
      <PortfolioPageHeader title="Overview" />

      <div className="mf-page-summary" aria-busy={isLoading}>
        {isLoading ? (
          <div className="mf-summary-grid mf-loading-grid">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="mf-stat-card mf-stat-skeleton" />
            ))}
          </div>
        ) : (
          <OverviewSummaryCards
            summary={summary}
            mfHoldings={mfHoldings}
            stockHoldings={stockHoldings}
            ppfCurrentValue={ppfCurrentValue}
            ppfInvested={ppfInvested}
          />
        )}
      </div>

      <div className="mf-page-sections overview-page-sections" aria-busy={isLoading}>
        {isLoading ? (
          <div className="mf-loading">
            <div className="mf-table-skeleton" />
          </div>
        ) : (
          <>
            {!hasPortfolioData && <OverviewEmptyState />}

            {(hasPortfolioData && (isProgressLoading || hasInvestmentProgress)) && (
              <section className="mf-section mf-section-portfolio-charts">
                {!isProgressLoading && (
                  <div className="mf-section-header mf-portfolio-charts-header">
                    <OverviewChartControls
                      activeTab={overviewCharts.activeTab}
                      onTabChange={overviewCharts.setActiveTab}
                      selectedIds={overviewCharts.selectedIds}
                      onTogglePortfolio={overviewCharts.togglePortfolio}
                      selectedRange={overviewCharts.selectedRange}
                      onRangeChange={overviewCharts.setSelectedRange}
                      benchmarkOptions={overviewCharts.benchmarkOptions}
                      selectedBenchmarkId={overviewCharts.selectedBenchmarkId}
                      onBenchmarkChange={overviewCharts.setSelectedBenchmarkId}
                      isBenchmarksLoading={isBenchmarksLoading}
                    />
                  </div>
                )}
                <div
                  ref={chartWrapRef}
                  className="mf-net-chart-wrap mf-net-chart-wrap--fill"
                  style={{ height: chartMinHeight }}
                  aria-busy={isProgressLoading}
                >
                  {isProgressLoading ? (
                    <div
                      className="mf-table-skeleton mf-progress-chart-skeleton"
                      style={{ height: estimateTabPanelHeight(chartMinHeight) }}
                    />
                  ) : (
                    <OverviewChartsPanel
                      activeTab={overviewCharts.activeTab}
                      activeTabLabel={overviewCharts.activeTabLabel}
                      filteredPoints={overviewCharts.filteredPoints}
                      progressChartPoints={overviewCharts.progressChartPoints}
                      benchmarkLabel={overviewCharts.benchmarkLabel}
                      drawdownPoints={overviewCharts.drawdownPoints}
                      profitLossPctPoints={overviewCharts.profitLossPctPoints}
                      quarterlyProfitPoints={overviewCharts.quarterlyProfitPoints}
                      holdingPctPoints={overviewCharts.holdingPctPoints}
                      plotHeight={chartPlotHeight}
                    />
                  )}
                </div>
              </section>
            )}

            <section className="mf-section">
              <div className="mf-section-header">
                <h2 className="mf-section-title">Portfolio breakdown</h2>
              </div>
              <PortfolioBreakdownStrip
                portfolios={portfolios}
                totalCurrentValue={summary.total_current_value}
              />
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
