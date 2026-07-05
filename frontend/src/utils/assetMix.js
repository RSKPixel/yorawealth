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
  { portfolioTotal, ppfCurrentValue = 0 } = {},
) {
  const values = emptyMixValues()

  for (const row of mfHoldings) {
    accumulateAssetMixValues(
      values,
      resolveMutualFundAssetClass(row),
      row.current_value,
    )
  }

  for (const row of stockHoldings) {
    accumulateAssetMixValues(
      values,
      resolveStockAssetClass(row),
      row.current_value,
    )
  }

  const ppfValue = Number(ppfCurrentValue) || 0
  if (ppfValue > 0) {
    accumulateAssetMixValues(values, 'Debt', ppfValue)
  }

  const mix = toAssetMixPercentages(values)
  if (!mix) {
    return null
  }

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
