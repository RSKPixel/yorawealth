import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  computeAssetMixPctSeries,
  computeBenchmarkSeries,
  computeDrawdownSeries,
  annotateDrawdownMaSignals,
  computeProfitLossPctSeries,
  computeQuarterlyProfitSeries,
  alignCurrentQuarterProfit,
  attachBenchmarkValues,
  buildNiftyCloseLookup,
  filterPointsByRange,
  mergePortfolioSeries,
  profitPctForPoint,
} from './investmentProgressChart.js'

describe('profitPctForPoint', () => {
  it('returns profit percent from invested and current values', () => {
    assert.equal(
      profitPctForPoint({ invested_value: 1000, current_value: 1200 }),
      20,
    )
  })

  it('returns zero when invested is zero', () => {
    assert.equal(
      profitPctForPoint({ invested_value: 0, current_value: 0 }),
      0,
    )
  })
})

describe('computeProfitLossPctSeries', () => {
  it('maps merged points to profit percent values', () => {
    const result = computeProfitLossPctSeries([
      { month: '2024-01', invested_value: 1000, current_value: 1100 },
    ])

    assert.equal(result[0].value_pct, 10)
  })

  it('skips months with no invested capital', () => {
    const result = computeProfitLossPctSeries([
      { month: '2024-01', invested_value: 0, current_value: 0 },
      { month: '2024-02', invested_value: 1000, current_value: 1100 },
    ])

    assert.equal(result.length, 1)
    assert.equal(result[0].month, '2024-02')
    assert.equal(result[0].value_pct, 10)
  })
})

describe('computeAssetMixPctSeries', () => {
  it('maps asset class values to allocation percentages', () => {
    const result = computeAssetMixPctSeries([
      {
        month: '2024-01',
        equity_value: 600,
        debt_value: 300,
        gold_value: 100,
      },
    ])

    assert.equal(result[0].equity_pct, 60)
    assert.equal(result[0].debt_pct, 30)
    assert.equal(result[0].gold_pct, 10)
  })

  it('returns zeros when there is no current value', () => {
    const result = computeAssetMixPctSeries([
      {
        month: '2024-01',
        equity_value: 0,
        debt_value: 0,
        gold_value: 0,
      },
    ])

    assert.deepEqual(result[0], {
      month: '2024-01',
      equity_pct: 0,
      debt_pct: 0,
      gold_pct: 0,
    })
  })
})

describe('computeBenchmarkSeries', () => {
  it('matches invested when nifty is flat and capital is added monthly', () => {
    const progressPoints = [
      { month: '2024-01', invested_value: 1000, current_value: 1000 },
      { month: '2024-02', invested_value: 2000, current_value: 2000 },
      { month: '2024-03', invested_value: 3000, current_value: 3000 },
    ]
    const niftyByMonth = new Map([
      ['2024-01', 100],
      ['2024-02', 100],
      ['2024-03', 100],
    ])

    const result = computeBenchmarkSeries(progressPoints, niftyByMonth)

    assert.equal(result.length, 3)
    assert.equal(result[0].benchmark_value, 1000)
    assert.equal(result[1].benchmark_value, 2000)
    assert.equal(result[2].benchmark_value, 3000)
  })

  it('reduces benchmark units proportionally on withdrawal', () => {
    const progressPoints = [
      { month: '2024-01', invested_value: 1000, current_value: 1000 },
      { month: '2024-02', invested_value: 500, current_value: 500 },
    ]
    const niftyByMonth = new Map([
      ['2024-01', 100],
      ['2024-02', 100],
    ])

    const result = computeBenchmarkSeries(progressPoints, niftyByMonth)

    assert.equal(result[0].benchmark_value, 1000)
    assert.equal(result[1].benchmark_value, 500)
  })

  it('skips months before capital is deployed', () => {
    const progressPoints = [
      { month: '2024-01', invested_value: 0, current_value: 0 },
      { month: '2024-02', invested_value: 1000, current_value: 1100 },
    ]
    const niftyByMonth = new Map([
      ['2024-01', 100],
      ['2024-02', 100],
    ])

    const result = computeBenchmarkSeries(progressPoints, niftyByMonth)

    assert.equal(result.length, 1)
    assert.equal(result[0].month, '2024-02')
    assert.equal(result[0].benchmark_value, 1000)
  })

  it('keeps flow-matched units when plotting a filtered window', () => {
    const progressPoints = [
      { month: '2024-01', invested_value: 1000, current_value: 1000 },
      { month: '2024-02', invested_value: 1000, current_value: 1500 },
      { month: '2024-03', invested_value: 2000, current_value: 2600 },
    ]
    const niftyByMonth = new Map([
      ['2024-01', 100],
      ['2024-02', 150],
      ['2024-03', 150],
    ])

    const full = computeBenchmarkSeries(progressPoints, niftyByMonth)
    const window = full.filter((point) => point.month >= '2024-03')
    const recomputed = computeBenchmarkSeries(
      progressPoints.filter((point) => point.month >= '2024-03'),
      niftyByMonth,
    )

    assert.equal(full[2].benchmark_value, 2500)
    assert.equal(window[0].benchmark_value, 2500)
    assert.notEqual(recomputed[0].benchmark_value, 2500)
    assert.equal(recomputed[0].benchmark_value, 2000)
  })
})

describe('computeDrawdownSeries', () => {
  it('returns zero drawdown at new profit highs', () => {
    const points = [
      { month: '2024-01', invested_value: 1000, current_value: 1050 },
      { month: '2024-02', invested_value: 1000, current_value: 1120 },
      { month: '2024-03', invested_value: 1000, current_value: 1150 },
    ]

    const result = computeDrawdownSeries(points)

    assert.deepEqual(
      result.map((point) => point.drawdown_pct),
      [0, 0, 0],
    )
    assert.deepEqual(
      result.map((point) => point.peak_profit_pct),
      [5, 12, 15],
    )
  })

  it('returns negative drawdown below the running peak', () => {
    const points = [
      { month: '2024-01', invested_value: 1000, current_value: 1100 },
      { month: '2024-02', invested_value: 1000, current_value: 1200 },
      { month: '2024-03', invested_value: 1000, current_value: 1080 },
    ]

    const result = computeDrawdownSeries(points)

    assert.equal(result[2].profit_pct, 8)
    assert.equal(result[2].peak_profit_pct, 20)
    assert.equal(result[2].drawdown_pct, -12)
  })

  it('resets peak when invested drops to zero', () => {
    const points = [
      { month: '2024-01', invested_value: 1000, current_value: 1200 },
      { month: '2024-02', invested_value: 0, current_value: 0 },
      { month: '2024-03', invested_value: 1000, current_value: 1100 },
    ]

    const result = computeDrawdownSeries(points)

    assert.equal(result.length, 2)
    assert.equal(result[0].peak_profit_pct, 20)
    assert.equal(result[1].drawdown_pct, 0)
    assert.equal(result[1].peak_profit_pct, 10)
  })

  it('keeps all-time peak when plotting a filtered window', () => {
    const points = [
      { month: '2024-01', invested_value: 1000, current_value: 1500 },
      { month: '2024-02', invested_value: 1000, current_value: 1200 },
      { month: '2024-03', invested_value: 1000, current_value: 1100 },
      { month: '2024-04', invested_value: 1000, current_value: 1300 },
    ]

    const full = computeDrawdownSeries(points)
    const window = filterPointsByRange(full, '1y').slice(-2)

    assert.equal(window[0].month, '2024-03')
    assert.equal(window[0].peak_profit_pct, 50)
    assert.equal(window[0].drawdown_pct, -40)
    assert.equal(window[1].peak_profit_pct, 50)
    assert.equal(window[1].drawdown_pct, -20)
  })

  it('returns to zero drawdown after a new peak', () => {
    const points = [
      { month: '2024-01', invested_value: 1000, current_value: 1200 },
      { month: '2024-02', invested_value: 1000, current_value: 1000 },
      { month: '2024-03', invested_value: 1000, current_value: 1300 },
    ]

    const result = computeDrawdownSeries(points)

    assert.equal(result[1].drawdown_pct, -20)
    assert.equal(result[2].drawdown_pct, 0)
    assert.equal(result[2].peak_profit_pct, 30)
  })

  it('marks when drawdown is 5pts worse than prior 3-point MA', () => {
    const series = [
      { month: '2024-01', drawdown_pct: 0 },
      { month: '2024-02', drawdown_pct: -2 },
      { month: '2024-03', drawdown_pct: -4 },
      // MA of prior 3 = -2; signal when <= -7
      { month: '2024-04', drawdown_pct: -8 },
      { month: '2024-05', drawdown_pct: -3 },
    ]

    const result = annotateDrawdownMaSignals(series)

    assert.equal(result[0].drawdown_ma_signal, false)
    assert.equal(result[1].drawdown_ma_signal, false)
    assert.equal(result[2].drawdown_ma_signal, false)
    assert.equal(result[3].drawdown_ma, -2)
    assert.equal(result[3].drawdown_ma_signal, true)
    assert.equal(result[4].drawdown_ma_signal, false)
  })
})

describe('computeQuarterlyProfitSeries', () => {
  it('uses quarter-end months when available', () => {
    const points = [
      { month: '2024-01', invested_value: 1000, current_value: 1050 },
      { month: '2024-03', invested_value: 1000, current_value: 1100 },
      { month: '2024-04', invested_value: 1200, current_value: 1250 },
      { month: '2024-06', invested_value: 1200, current_value: 1400 },
    ]

    const result = computeQuarterlyProfitSeries(points)

    assert.equal(result.length, 2)
    assert.equal(result[0].key, '2024-Q1')
    assert.equal(result[0].month, '2024-03')
    assert.equal(result[0].label, 'Q1 2024')
    assert.equal(result[0].profit, 100)
    assert.equal(result[1].key, '2024-Q2')
    assert.equal(result[1].month, '2024-06')
    assert.equal(result[1].profit, 200)
  })

  it('uses latest month of incomplete quarter', () => {
    const points = [
      { month: '2025-07', invested_value: 1000, current_value: 1000 },
      { month: '2025-08', invested_value: 1000, current_value: 1180 },
    ]

    const result = computeQuarterlyProfitSeries(points)

    assert.equal(result.length, 1)
    assert.equal(result[0].key, '2025-Q3')
    assert.equal(result[0].month, '2025-08')
    assert.equal(result[0].profit, 180)
  })

  it('skips months with no invested capital', () => {
    const points = [
      { month: '2024-03', invested_value: 0, current_value: 0 },
      { month: '2024-06', invested_value: 1000, current_value: 1100 },
    ]

    const result = computeQuarterlyProfitSeries(points)

    assert.equal(result.length, 1)
    assert.equal(result[0].key, '2024-Q2')
  })

  it('aligns current quarter tip to live unrealized gain', () => {
    const series = computeQuarterlyProfitSeries([
      { month: '2026-04', invested_value: 1000, current_value: 1100 },
      { month: '2026-07', invested_value: 1000, current_value: 1200 },
    ])
    const aligned = alignCurrentQuarterProfit(
      series,
      7040000,
      new Date('2026-07-21T00:00:00'),
    )

    assert.equal(aligned.at(-1).key, '2026-Q3')
    assert.equal(aligned.at(-1).profit, 7040000)
    assert.equal(aligned[0].profit, 100)
  })
})

describe('mergePortfolioSeries', () => {
  it('sums selected portfolio values by month', () => {
    const merged = mergePortfolioSeries(
      {
        mf: [
          {
            month: '2024-01',
            invested_value: 100,
            current_value: 110,
            equity_value: 110,
            debt_value: 0,
            gold_value: 0,
          },
        ],
        stocks: [
          {
            month: '2024-01',
            invested_value: 50,
            current_value: 60,
            equity_value: 60,
            debt_value: 0,
            gold_value: 0,
          },
        ],
        ppf: [],
      },
      ['mf', 'stocks'],
    )

    const january = merged.find((point) => point.month === '2024-01')
    assert.equal(january.invested_value, 150)
    assert.equal(january.current_value, 170)
    assert.equal(january.equity_value, 170)
    assert.equal(january.debt_value, 0)
    assert.equal(january.gold_value, 0)
  })
})

describe('filterPointsByRange', () => {
  it('returns the latest N months for a bounded range', () => {
    const points = [
      { month: '2024-01', invested_value: 1, current_value: 1 },
      { month: '2024-02', invested_value: 1, current_value: 1 },
      { month: '2024-03', invested_value: 1, current_value: 1 },
    ]

    const filtered = filterPointsByRange(points, '1y')
    assert.equal(filtered.length, 3)
  })
})
