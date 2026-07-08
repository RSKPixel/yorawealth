function geomSeries(z, m, n) {
  let amt
  if (z === 1) {
    amt = n + 1
  } else {
    amt = (z ** (n + 1) - 1) / (z - 1)
  }
  if (m >= 1) {
    amt -= geomSeries(z, 0, m - 1)
  }
  return amt
}

/**
 * SEBI future value formula:
 * FV = PV(1+r)^y + annualAddition × geomSeries(1+r, 1, y)
 * @see https://investor.sebi.gov.in/calc/future-value.html
 */
export function calculateFutureValue(
  currentPrincipal,
  annualAddition,
  growthRatePercent,
  years,
) {
  const principal = Number(currentPrincipal)
  const addition = Number(annualAddition)
  const rate = Number(growthRatePercent)
  const period = Number(years)

  if (!Number.isFinite(principal) || principal < 0) {
    return null
  }
  if (!Number.isFinite(addition) || addition < 0) {
    return null
  }
  if (!Number.isFinite(rate)) {
    return null
  }
  if (!Number.isFinite(period) || period < 0) {
    return null
  }

  const r = rate / 100
  const principalFuture = principal * (1 + r) ** period
  const additionFuture = addition * geomSeries(1 + r, 1, period)
  const futureValue = principalFuture + additionFuture
  const totalInvested = principal + addition * period
  const totalGain = futureValue - totalInvested

  return {
    currentPrincipal: principal,
    annualAddition: addition,
    principalFuture,
    additionFuture,
    futureValue,
    totalInvested,
    totalGain,
    gainPercent: totalInvested > 0 ? (totalGain / totalInvested) * 100 : null,
  }
}
