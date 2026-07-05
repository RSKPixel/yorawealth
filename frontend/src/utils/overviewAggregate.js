export function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function aggregateSummary(parts) {
  const totals = parts.reduce(
    (acc, part) => {
      acc.total_invested += toNumber(part.total_invested)
      acc.total_current_value += toNumber(part.total_current_value)
      acc.total_unrealized_gain += toNumber(part.total_unrealized_gain)

      const partValue = toNumber(part.total_current_value)
      if (part.xirr != null && !Number.isNaN(part.xirr) && partValue > 0) {
        acc.xirrWeight += partValue
        acc.xirrWeighted += part.xirr * partValue
      }

      return acc
    },
    {
      total_invested: 0,
      total_current_value: 0,
      total_unrealized_gain: 0,
      xirrWeight: 0,
      xirrWeighted: 0,
    },
  )

  return {
    total_invested: totals.total_invested,
    total_current_value: totals.total_current_value,
    total_unrealized_gain: totals.total_unrealized_gain,
    xirr: totals.xirrWeight > 0 ? totals.xirrWeighted / totals.xirrWeight : null,
  }
}

export function hasAnyPortfolioData({
  mfHoldings = [],
  stockHoldings = [],
  ppfInvestments = [],
  mfSummary,
  stockSummary,
  ppfSummary,
  summary,
}) {
  if (
    mfHoldings.length > 0 ||
    stockHoldings.length > 0 ||
    ppfInvestments.length > 0
  ) {
    return true
  }

  return (
    toNumber(mfSummary?.total_current_value) > 0 ||
    toNumber(stockSummary?.total_current_value) > 0 ||
    toNumber(ppfSummary?.total_current_value) > 0 ||
    toNumber(summary?.total_current_value) > 0
  )
}
