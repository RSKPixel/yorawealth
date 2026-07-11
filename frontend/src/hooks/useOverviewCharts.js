import { useEffect, useMemo, useState } from 'react'
import {
  PORTFOLIO_OPTIONS,
  TIME_RANGE_OPTIONS,
  attachBenchmarkValues,
  buildNiftyCloseLookup,
  computeAssetMixPctSeries,
  computeBenchmarkSeries,
  computeDrawdownSeries,
  computeProfitLossPctSeries,
  filterPointsByRange,
  mergePortfolioSeries,
} from '../utils/investmentProgressChart'

export const CHART_TABS = [
  { id: 'progress', label: 'Investment progress' },
  { id: 'drawdown', label: 'Drawdown' },
  { id: 'pl_pct', label: 'Profit & Loss %' },
  { id: 'holding_pct', label: 'Holding %' },
]

export function useOverviewCharts(seriesByPortfolio, benchmarks = []) {
  const optionsWithData = useMemo(
    () =>
      PORTFOLIO_OPTIONS.filter(
        (option) => (seriesByPortfolio?.[option.id]?.length ?? 0) > 0,
      ),
    [seriesByPortfolio],
  )

  const benchmarkOptions = useMemo(
    () =>
      (benchmarks ?? []).filter((benchmark) => (benchmark.points?.length ?? 0) > 0),
    [benchmarks],
  )

  const [activeTab, setActiveTab] = useState('progress')
  const [selectedIds, setSelectedIds] = useState(() =>
    PORTFOLIO_OPTIONS.map((option) => option.id),
  )
  const [selectedRange, setSelectedRange] = useState('3y')
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState('NIFTYBEES')
  const [hasUserPickedBenchmark, setHasUserPickedBenchmark] = useState(false)

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

  useEffect(() => {
    if (hasUserPickedBenchmark || benchmarkOptions.length === 0) {
      return
    }

    const niftyBees = benchmarkOptions.find(
      (benchmark) =>
        benchmark.id === 'NIFTYBEES' ||
        benchmark.label?.toUpperCase() === 'NIFTYBEES',
    )
    if (niftyBees) {
      setSelectedBenchmarkId(niftyBees.id)
    }
  }, [benchmarkOptions, hasUserPickedBenchmark])

  const onBenchmarkChange = (nextId) => {
    setHasUserPickedBenchmark(true)
    setSelectedBenchmarkId(nextId)
  }

  const selectedBenchmark = useMemo(
    () =>
      selectedBenchmarkId
        ? benchmarkOptions.find((benchmark) => benchmark.id === selectedBenchmarkId)
        : undefined,
    [benchmarkOptions, selectedBenchmarkId],
  )

  const activePoints = useMemo(
    () => mergePortfolioSeries(seriesByPortfolio, selectedIds),
    [seriesByPortfolio, selectedIds],
  )

  const filteredPoints = useMemo(
    () => filterPointsByRange(activePoints, selectedRange),
    [activePoints, selectedRange],
  )

  const benchmarkCloseLookup = useMemo(
    () =>
      buildNiftyCloseLookup(
        selectedBenchmark?.points ?? [],
        activePoints.map((point) => point.month),
      ),
    [activePoints, selectedBenchmark],
  )

  const fullBenchmarkPoints = useMemo(
    () => computeBenchmarkSeries(activePoints, benchmarkCloseLookup),
    [activePoints, benchmarkCloseLookup],
  )

  const benchmarkPoints = useMemo(
    () => filterPointsByRange(fullBenchmarkPoints, selectedRange),
    [fullBenchmarkPoints, selectedRange],
  )

  const progressChartPoints = useMemo(
    () => attachBenchmarkValues(filteredPoints, benchmarkPoints),
    [benchmarkPoints, filteredPoints],
  )

  const drawdownPoints = useMemo(
    () =>
      filterPointsByRange(computeDrawdownSeries(activePoints), selectedRange),
    [activePoints, selectedRange],
  )

  const profitLossPctPoints = useMemo(
    () => computeProfitLossPctSeries(filteredPoints),
    [filteredPoints],
  )

  const holdingPctPoints = useMemo(
    () => computeAssetMixPctSeries(filteredPoints),
    [filteredPoints],
  )

  const togglePortfolio = (id) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        if (current.length === 1) {
          return current
        }
        return current.filter((item) => item !== id)
      }
      return [...current, id]
    })
  }

  const activeTabLabel =
    CHART_TABS.find((tab) => tab.id === activeTab)?.label ?? 'Chart'

  return {
    activeTab,
    setActiveTab,
    selectedIds,
    selectedRange,
    setSelectedRange,
    togglePortfolio,
    benchmarkOptions,
    selectedBenchmarkId,
    setSelectedBenchmarkId: onBenchmarkChange,
    benchmarkLabel: selectedBenchmark?.label ?? '',
    filteredPoints,
    progressChartPoints,
    drawdownPoints,
    profitLossPctPoints,
    holdingPctPoints,
    activeTabLabel,
  }
}

export { PORTFOLIO_OPTIONS, TIME_RANGE_OPTIONS }
