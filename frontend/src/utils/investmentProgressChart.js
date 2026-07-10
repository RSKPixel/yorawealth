export const CHART_START_MONTH = '2022-01'

export const PORTFOLIO_OPTIONS = [
  { id: 'mf', label: 'Mutual Fund' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'ppf', label: 'PPF' },
]

export const TIME_RANGE_OPTIONS = [
  { id: '3m', label: '3M', months: 3 },
  { id: '1y', label: '1Y', months: 12 },
  { id: '2y', label: '2Y', months: 24 },
  { id: '3y', label: '3Y', months: 36 },
  { id: '5y', label: '5Y', months: 60 },
  { id: 'all', label: 'All', months: null },
]

export function enumerateMonths(startMonth, endMonth) {
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

export function mergePortfolioSeries(seriesByPortfolio, selectedIds) {
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
          equity_value: Number(point.equity_value) || 0,
          debt_value: Number(point.debt_value) || 0,
          gold_value: Number(point.gold_value) || 0,
        })
        continue
      }

      existing.invested_value += Number(point.invested_value) || 0
      existing.current_value += Number(point.current_value) || 0
      existing.equity_value += Number(point.equity_value) || 0
      existing.debt_value += Number(point.debt_value) || 0
      existing.gold_value += Number(point.gold_value) || 0
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
        equity_value: 0,
        debt_value: 0,
        gold_value: 0,
      },
  )
}

export function filterPointsByRange(points, rangeId) {
  if (!points.length) {
    return []
  }

  const option = TIME_RANGE_OPTIONS.find((entry) => entry.id === rangeId)
  if (!option || option.months == null) {
    return points.filter((point) => point.month >= CHART_START_MONTH)
  }

  return points.slice(-option.months)
}

function roundPct(value) {
  return Math.round(value * 100) / 100
}

export function profitPctForPoint(point) {
  const invested = Number(point.invested_value) || 0
  const current = Number(point.current_value) || 0

  if (invested <= 0) {
    return 0
  }

  return roundPct(((current - invested) / invested) * 100)
}

export function computeProfitLossPctSeries(points) {
  return points
    .filter((point) => (Number(point.invested_value) || 0) > 0)
    .map((point) => ({
      month: point.month,
      value_pct: profitPctForPoint(point),
    }))
}

export function computeAssetMixPctSeries(points) {
  return points.map((point) => {
    const equity = Number(point.equity_value) || 0
    const debt = Number(point.debt_value) || 0
    const gold = Number(point.gold_value) || 0
    const total = equity + debt + gold

    if (total <= 0) {
      return {
        month: point.month,
        equity_pct: 0,
        debt_pct: 0,
        gold_pct: 0,
      }
    }

    const equity_pct = roundPct((equity / total) * 100)
    const debt_pct = roundPct((debt / total) * 100)
    const gold_pct = roundPct(100 - equity_pct - debt_pct)

    return {
      month: point.month,
      equity_pct,
      debt_pct,
      gold_pct,
    }
  })
}

function roundMoney(value) {
  return Math.round(value * 100) / 100
}

export function buildNiftyCloseLookup(niftyPoints, progressMonths) {
  const sorted = [...(niftyPoints ?? [])].sort((a, b) =>
    a.month.localeCompare(b.month),
  )
  let index = 0
  let lastClose = null
  const lookup = new Map()

  for (const month of progressMonths) {
    while (index < sorted.length && sorted[index].month <= month) {
      const close = Number(sorted[index].close)
      if (Number.isFinite(close) && close > 0) {
        lastClose = close
      }
      index += 1
    }

    if (lastClose != null) {
      lookup.set(month, lastClose)
    }
  }

  return lookup
}

export function computeBenchmarkSeries(progressPoints, niftyByMonth) {
  if (!niftyByMonth?.size) {
    return []
  }

  let units = 0
  let prevInvested = 0
  let started = false
  const result = []

  for (const point of progressPoints) {
    const invested = Number(point.invested_value) || 0
    const close = niftyByMonth.get(point.month)

    if (invested <= 0) {
      if (started && prevInvested > 0) {
        units = 0
        prevInvested = 0
        started = false
      }
      continue
    }

    const priorInvested = prevInvested
    const netFlow = invested - priorInvested
    prevInvested = invested
    started = true

    if (close && close > 0) {
      if (netFlow > 0) {
        units += netFlow / close
      } else if (netFlow < 0 && priorInvested > 0) {
        units *= invested / priorInvested
      }
    }

    const benchmarkValue =
      close && close > 0 && units > 0 ? roundMoney(units * close) : null

    if (benchmarkValue != null && benchmarkValue > 0) {
      result.push({
        month: point.month,
        benchmark_value: benchmarkValue,
      })
    }
  }

  return result
}

export function attachBenchmarkValues(progressPoints, benchmarkPoints) {
  const byMonth = new Map(
    benchmarkPoints.map((point) => [point.month, point.benchmark_value]),
  )

  return progressPoints.map((point) => ({
    ...point,
    benchmark_value: byMonth.get(point.month) ?? null,
  }))
}

export function computeDrawdownSeries(points) {
  let peakProfitPct = 0
  let hadPosition = false
  const result = []

  for (const point of points) {
    const invested = Number(point.invested_value) || 0

    if (invested <= 0) {
      if (hadPosition) {
        peakProfitPct = 0
      }
      hadPosition = false
      continue
    }

    hadPosition = true
    const profitPct = profitPctForPoint(point)

    if (profitPct > peakProfitPct) {
      peakProfitPct = profitPct
    }

    result.push({
      month: point.month,
      profit_pct: profitPct,
      peak_profit_pct: peakProfitPct,
      drawdown_pct: roundPct(profitPct - peakProfitPct),
    })
  }

  return result
}
