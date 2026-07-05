import { MANUAL_TRADE_TYPES, RATE_OPTIONAL_TRADE_TYPES } from '../components/stocks/tradeTypes'
import { ZERODHA_BROKER } from '../components/stocks/stockBrokers'

const SYMBOL_PATTERN = /^[A-Z0-9&.-]+$/

export function validateManualTradeForm({
  tradeDate,
  symbol,
  quantity,
  rate,
  tradeType,
}) {
  if (!tradeDate) {
    return 'Trade date is required.'
  }

  const normalizedSymbol = symbol?.trim().toUpperCase()
  if (!normalizedSymbol) {
    return 'Symbol is required.'
  }

  if (!SYMBOL_PATTERN.test(normalizedSymbol)) {
    return 'Enter a valid symbol (letters, numbers, &, ., -).'
  }

  const parsedQuantity = Number(quantity)
  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    return 'Quantity must be a whole number greater than zero.'
  }

  if (!tradeType) {
    return 'Trade type is required.'
  }

  const parsedRate = Number(rate)
  if (Number.isNaN(parsedRate) || parsedRate < 0) {
    return 'Rate must be zero or greater.'
  }

  if (!RATE_OPTIONAL_TRADE_TYPES.has(tradeType) && parsedRate <= 0) {
    return 'Rate must be greater than zero for this trade type.'
  }

  const tradeDateValue = new Date(`${tradeDate}T00:00:00`)
  if (Number.isNaN(tradeDateValue.getTime())) {
    return 'Enter a valid trade date.'
  }

  return null
}

export function buildManualTradePayload(form) {
  return {
    trade_date: form.tradeDate,
    symbol: form.symbol.trim().toUpperCase(),
    quantity: Number(form.quantity),
    rate: Number(form.rate || 0),
    trade_type: form.tradeType,
    broker: form.broker,
  }
}

export function manualTradeToForm(trade) {
  return {
    tradeDate: trade.transaction_date,
    symbol: trade.symbol,
    quantity: String(trade.quantity),
    rate: String(trade.price),
    tradeType: trade.trade_type,
    broker: trade.broker ?? ZERODHA_BROKER,
  }
}

export { MANUAL_TRADE_TYPES }
