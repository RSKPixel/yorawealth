const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const quantityFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

const navFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

export function formatTradeValue(value) {
  return currencyFormatter.format(value)
}

export function formatTradeValueInMillions(value) {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  const abs = Math.abs(value)

  if (abs < 1_000_000) {
    const lakhs = value / 100_000
    const absLakhs = Math.abs(lakhs)
    const digits = absLakhs >= 100 ? 1 : absLakhs >= 10 ? 2 : 2

    return `₹${lakhs.toFixed(digits)}L`
  }

  const millions = value / 1_000_000
  const absMillions = Math.abs(millions)
  const digits = absMillions >= 100 ? 1 : absMillions >= 10 ? 2 : 2

  return `₹${millions.toFixed(digits)}M`
}

function compactAmountDigits(scaledValue) {
  const abs = Math.abs(scaledValue)
  if (abs >= 100) return 1
  if (abs >= 10) return 2
  return 2
}

export function formatTradeValueCompact(value) {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  const abs = Math.abs(value)

  if (abs >= 1_000_000) {
    const millions = value / 1_000_000
    return `₹${millions.toFixed(compactAmountDigits(millions))}M`
  }

  if (abs >= 100_000) {
    const lakhs = value / 100_000
    return `₹${lakhs.toFixed(compactAmountDigits(lakhs))}L`
  }

  return formatTradeValue(value)
}

export function formatTradeValueTooltip(value) {
  if (value == null || Number.isNaN(value) || Math.abs(value) < 100_000) {
    return null
  }

  return formatTradeValue(value)
}

export function formatQuantity(value) {
  return quantityFormatter.format(value)
}

export function formatNav(value) {
  return navFormatter.format(value)
}

export function formatPct(value, decimals = 2) {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  return `${value.toFixed(decimals)}%`
}

export function formatPctSigned(value) {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatPercent(value) {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  return formatPct(value * 100)
}

export function formatPercentSigned(value) {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  return formatPctSigned(value * 100)
}

export function formatTransactionDate(value) {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
