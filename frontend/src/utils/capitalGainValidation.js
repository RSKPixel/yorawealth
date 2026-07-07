const SALE_REASON_MAX_LENGTH = 100

const EMPTY_FORM = {
  assetType: 'stock',
  transactionDate: '',
  label: '',
  folio: '',
  broker: '',
  meta: '',
  quantity: '',
  sellRate: '',
  buyRate: '',
  tradeValue: '',
  purchaseValue: '',
  shortTermGain: '',
  longTermGain: '',
  shortTermHoldingPeriodDays: '',
  longTermHoldingPeriodDays: '',
  tradeType: 'SELL',
  saleReason: '',
}

export function capitalGainToForm(record) {
  if (!record) {
    return EMPTY_FORM
  }

  return {
    assetType: record.asset_type ?? 'stock',
    transactionDate: record.transaction_date ?? '',
    label: record.label ?? '',
    folio: record.folio ?? '',
    broker: record.broker ?? '',
    meta: record.meta ?? '',
    quantity: record.quantity != null ? String(record.quantity) : '',
    sellRate: record.sell_rate != null ? String(record.sell_rate) : '',
    buyRate: record.buy_rate != null ? String(record.buy_rate) : '',
    tradeValue: record.trade_value != null ? String(record.trade_value) : '',
    purchaseValue: record.purchase_value != null ? String(record.purchase_value) : '',
    shortTermGain: record.short_term_gain != null ? String(record.short_term_gain) : '',
    longTermGain: record.long_term_gain != null ? String(record.long_term_gain) : '',
    shortTermHoldingPeriodDays:
      record.short_term_holding_period_days != null
        ? String(record.short_term_holding_period_days)
        : '',
    longTermHoldingPeriodDays:
      record.long_term_holding_period_days != null
        ? String(record.long_term_holding_period_days)
        : '',
    tradeType: record.trade_type ?? 'SELL',
    saleReason: record.sale_reason ?? '',
  }
}

export function buildCapitalGainPayload(form, { isManualEdit = true } = {}) {
  if (!isManualEdit) {
    return {
      sale_reason: form.saleReason.trim() || null,
    }
  }

  return {
    asset_type: form.assetType,
    transaction_date: form.transactionDate,
    label: form.label.trim(),
    folio: form.folio.trim() || null,
    broker: form.broker.trim() || null,
    meta: form.meta.trim() || null,
    quantity: Number(form.quantity),
    sell_rate: Number(form.sellRate),
    buy_rate: Number(form.buyRate),
    trade_value: Number(form.tradeValue),
    purchase_value: Number(form.purchaseValue),
    short_term_gain: Number(form.shortTermGain || 0),
    long_term_gain: Number(form.longTermGain || 0),
    short_term_holding_period_days: Number(form.shortTermHoldingPeriodDays || 0),
    long_term_holding_period_days: Number(form.longTermHoldingPeriodDays || 0),
    trade_type: form.tradeType.trim() || 'SELL',
    sale_reason: form.saleReason.trim() || null,
  }
}

export function validateCapitalGainForm(form, { isManual = true } = {}) {
  if (!isManual) {
    if (form.saleReason.length > SALE_REASON_MAX_LENGTH) {
      return `Reason for sale must be ${SALE_REASON_MAX_LENGTH} characters or fewer.`
    }
    return null
  }

  if (!form.transactionDate) {
    return 'Transaction date is required.'
  }
  if (!form.label.trim()) {
    return 'Symbol or fund name is required.'
  }
  if (!form.quantity || Number(form.quantity) <= 0) {
    return 'Quantity must be greater than zero.'
  }
  if (!form.tradeValue || Number.isNaN(Number(form.tradeValue))) {
    return 'Sale value is required.'
  }
  if (!form.purchaseValue || Number.isNaN(Number(form.purchaseValue))) {
    return 'Purchase value is required.'
  }
  if (form.assetType === 'stock' && !form.broker.trim()) {
    return 'Broker is required for stock records.'
  }
  if (form.saleReason.length > SALE_REASON_MAX_LENGTH) {
    return `Reason for sale must be ${SALE_REASON_MAX_LENGTH} characters or fewer.`
  }

  return null
}

export { EMPTY_FORM, SALE_REASON_MAX_LENGTH }
