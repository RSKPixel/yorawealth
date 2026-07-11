import { CATEGORY_ORDER, normalizeAssetClass } from './categoryAllocation'
import { classifyStockAssetClass } from './stockAssetClass'

export function resolveStockAssetClass(row) {
  return normalizeAssetClass(classifyStockAssetClass(row))
}

export function resolveMutualFundAssetClass(row) {
  return normalizeAssetClass(row.asset_class)
}

export function sumCurrentValue(holdings = []) {
  return holdings.reduce((sum, row) => sum + (Number(row.current_value) || 0), 0)
}

function emptyMixValues() {
  return { Equity: 0, Debt: 0, Gold: 0 }
}

export function accumulateAssetMixValues(values, assetClass, amount) {
  const normalizedClass = normalizeAssetClass(assetClass)
  values[normalizedClass] += Number(amount) || 0
}

export function toAssetMixPercentages(values) {
  const equityValue = values.Equity
  const debtValue = values.Debt
  const goldValue = values.Gold
  const total = equityValue + debtValue + goldValue

  if (total <= 0) {
    return null
  }

  const equityPct = (equityValue / total) * 100
  const debtPct = (debtValue / total) * 100
  const goldPct = 100 - equityPct - debtPct

  return {
    equityValue,
    debtValue,
    goldValue,
    total,
    equityPct,
    debtPct,
    goldPct,
  }
}

export function computePortfolioAssetMix(
  mfHoldings = [],
  stockHoldings = [],
  { portfolioTotal, ppfCurrentValue = 0, ppfInvested = 0 } = {},
) {
  const values = emptyMixValues()
  const invested = emptyMixValues()

  for (const row of mfHoldings) {
    const assetClass = resolveMutualFundAssetClass(row)
    accumulateAssetMixValues(values, assetClass, row.current_value)
    accumulateAssetMixValues(invested, assetClass, row.invested_amount)
  }

  for (const row of stockHoldings) {
    const assetClass = resolveStockAssetClass(row)
    accumulateAssetMixValues(values, assetClass, row.current_value)
    accumulateAssetMixValues(invested, assetClass, row.invested_amount)
  }

  const ppfValue = Number(ppfCurrentValue) || 0
  if (ppfValue > 0) {
    accumulateAssetMixValues(values, 'Debt', ppfValue)
  }

  const ppfInvestedAmount = Number(ppfInvested) || 0
  if (ppfInvestedAmount > 0) {
    accumulateAssetMixValues(invested, 'Debt', ppfInvestedAmount)
  }

  const mix = toAssetMixPercentages(values)
  if (!mix) {
    return null
  }

  mix.equityInvested = invested.Equity
  mix.debtInvested = invested.Debt
  mix.goldInvested = invested.Gold
  mix.totalInvested = invested.Equity + invested.Debt + invested.Gold

  if (portfolioTotal != null) {
    mix.portfolioTotal = portfolioTotal
    mix.unclassifiedValue = portfolioTotal - mix.total
  }

  return mix
}

export function assetMixPercentagesSumTo100(mix, tolerance = 0.01) {
  if (!mix) return false
  const sum = mix.equityPct + mix.debtPct + mix.goldPct
  return Math.abs(sum - 100) <= tolerance
}

export function assetMixValuesMatchPortfolio(mix, portfolioTotal, tolerance = 0.01) {
  if (!mix || portfolioTotal == null) return true
  return Math.abs(mix.total - portfolioTotal) <= tolerance
}

export { CATEGORY_ORDER }
