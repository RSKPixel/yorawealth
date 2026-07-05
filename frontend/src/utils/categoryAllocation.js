export const CATEGORY_ORDER = ['Equity', 'Debt', 'Gold']
export const REBALANCING_PCT_BUFFER = 1

export function normalizeAssetClass(value) {
  if (value == null || value === '') return 'Equity'

  const trimmed = String(value).trim()
  const match = CATEGORY_ORDER.find(
    (category) => category.toLowerCase() === trimmed.toLowerCase(),
  )

  return match ?? 'Equity'
}

export function computeCategoryAllocation(holdings) {
  const values = { Equity: 0, Debt: 0, Gold: 0 }
  const counts = { Equity: 0, Debt: 0, Gold: 0 }

  for (const row of holdings) {
    const category = normalizeAssetClass(row.asset_class)
    if (category in values) {
      values[category] += row.current_value
      counts[category] += 1
    }
  }

  const total = values.Equity + values.Debt + values.Gold
  const categories = CATEGORY_ORDER.map((name) => ({
    name,
    value: values[name],
    count: counts[name],
    pct: total > 0 ? (values[name] / total) * 100 : 0,
  }))

  return { total, categories, values, counts }
}

export function parseTargetPctMap(targets) {
  const map = {}
  for (const name of CATEGORY_ORDER) {
    const raw = targets?.[name]
    const parsed = parseFloat(raw)
    map[name] = raw !== '' && raw != null && !Number.isNaN(parsed) ? parsed : null
  }
  return map
}

export function hasCompleteTargetAllocation(targetPcts) {
  return CATEGORY_ORDER.every((name) => targetPcts[name] != null)
}

export function computeRebalancing(allocation, targetPcts) {
  const { total, categories } = allocation
  if (!total) {
    return { rows: [], total: 0, hasTargets: hasCompleteTargetAllocation(targetPcts) }
  }

  const rows = CATEGORY_ORDER.map((name) => {
    const category = categories.find((item) => item.name === name)
    const currentValue = category?.value ?? 0
    const currentPct = category?.pct ?? 0
    const targetPct = targetPcts[name]
    const targetValue =
      targetPct != null ? (total * targetPct) / 100 : null
    const pctDrift = targetPct != null ? currentPct - targetPct : null
    const withinBuffer =
      pctDrift != null && Math.abs(pctDrift) <= REBALANCING_PCT_BUFFER
    const rawDelta = targetValue != null ? targetValue - currentValue : null
    const delta = rawDelta != null && withinBuffer ? null : rawDelta

    return {
      name,
      currentValue,
      currentPct,
      targetPct,
      targetValue,
      pctDrift,
      withinBuffer,
      delta,
    }
  })

  return {
    rows,
    total,
    hasTargets: hasCompleteTargetAllocation(targetPcts),
  }
}

export function categoryWeightPct(row, categoryValues) {
  const category = normalizeAssetClass(row.asset_class)
  const categoryTotal = categoryValues[category] ?? 0
  if (categoryTotal <= 0) return 0
  return (row.current_value / categoryTotal) * 100
}

export function portfolioWeightPct(currentValue, totalValue) {
  if (!totalValue) return 0
  return (currentValue / totalValue) * 100
}
