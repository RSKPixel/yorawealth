import { formatTradeValue } from './mutualFundFormat'

function toGainNumber(value) {
  if (value == null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeRealizedGainRow(row) {
  const realizedGain = toGainNumber(row.realized_gain) ?? 0
  let shortTermGain = toGainNumber(row.short_term_gain)
  let longTermGain = toGainNumber(row.long_term_gain)

  if (shortTermGain == null && longTermGain == null) {
    shortTermGain = realizedGain
    longTermGain = 0
  } else {
    shortTermGain = shortTermGain ?? 0
    longTermGain = longTermGain ?? 0
  }

  const splitTotal = shortTermGain + longTermGain
  if (splitTotal === 0 && realizedGain !== 0) {
    shortTermGain = realizedGain
    longTermGain = 0
  } else if (splitTotal !== 0 && Math.abs(splitTotal - realizedGain) > 0.01) {
    shortTermGain += realizedGain - splitTotal
  }

  return {
    ...row,
    short_term_gain: shortTermGain,
    long_term_gain: longTermGain,
  }
}

export function formatGainAmount(value) {
  const parsed = toGainNumber(value)
  if (parsed == null) {
    return '—'
  }

  return formatTradeValue(parsed)
}

export function formatHoldingPeriod(days) {
  if (days == null || days === '' || Number.isNaN(Number(days))) {
    return '—'
  }

  return `${Math.max(0, Math.round(Number(days)))} days`
}
