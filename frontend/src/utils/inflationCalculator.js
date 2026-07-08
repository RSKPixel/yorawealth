/**
 * Projects monthly expense forward under constant annual inflation.
 * future = present × (1 + rate/100)^years
 */
export function calculateFutureCost(monthlyExpenses, annualInflationPercent, years) {
  const present = Number(monthlyExpenses)
  const rate = Number(annualInflationPercent)
  const period = Number(years)

  if (!Number.isFinite(present) || present < 0) {
    return null
  }
  if (!Number.isFinite(rate) || rate < 0) {
    return null
  }
  if (!Number.isFinite(period) || period < 0) {
    return null
  }

  const multiplier = (1 + rate / 100) ** period
  const futureMonthly = present * multiplier

  return {
    currentMonthly: present,
    currentAnnual: present * 12,
    futureMonthly,
    futureAnnual: futureMonthly * 12,
    multiplier,
    totalIncrease: futureMonthly - present,
  }
}
