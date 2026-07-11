import { normalizeAssetClass } from './categoryAllocation'

// Keep in sync with backend/app/services/stock_asset_class.py
const SGB_SYMBOL_PATTERN = /^SGB/i
const SGB_ISIN_PREFIX = 'IN0020'

export function normalizeStockSymbol(symbol) {
  const value = (symbol ?? '').trim().toUpperCase()
  const dashIndex = value.indexOf('-')
  return dashIndex === -1 ? value : value.slice(0, dashIndex)
}

export function classifyStockAssetClass({ symbol, isin, name, asset_class: assetClass } = {}) {
  const normalizedSymbol = normalizeStockSymbol(symbol)
  if (SGB_SYMBOL_PATTERN.test(normalizedSymbol)) {
    return 'Gold'
  }

  const isinUpper = (isin ?? '').trim().toUpperCase()
  if (isinUpper.startsWith(SGB_ISIN_PREFIX)) {
    return 'Gold'
  }

  const nameUpper = (name ?? '').toUpperCase()
  if (nameUpper.includes('SOVEREIGN GOLD BOND') || nameUpper.includes(' GOLD BOND')) {
    return 'Gold'
  }

  if (assetClass) {
    return normalizeAssetClass(assetClass)
  }

  return 'Equity'
}
