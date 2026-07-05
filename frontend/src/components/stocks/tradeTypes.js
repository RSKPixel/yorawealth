export const MANUAL_TRADE_TYPES = [
  { value: 'BUY', label: 'Buy' },
  { value: 'SELL', label: 'Sell' },
  { value: 'BUY BACK', label: 'Buy Back' },
  { value: 'SPLIT', label: 'Split' },
  { value: 'BONUS', label: 'Bonus' },
  { value: 'DEMERGER', label: 'Demerger' },
  { value: 'IPO', label: 'IPO' },
]

export const RATE_OPTIONAL_TRADE_TYPES = new Set(['BONUS', 'SPLIT', 'DEMERGER'])

export function getManualTradeTypeLabel(value) {
  return MANUAL_TRADE_TYPES.find((option) => option.value === value)?.label ?? value
}
