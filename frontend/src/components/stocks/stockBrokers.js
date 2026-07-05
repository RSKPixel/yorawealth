export const ZERODHA_BROKER = 'Zerodha'
export const ZERODHA_TRADEBOOK_TEMPLATE_ID = 'zerodha_tradebook_csv'

export const STOCK_BROKERS = [
  {
    id: ZERODHA_BROKER,
    label: ZERODHA_BROKER,
    accept: '.csv,text/csv',
    hint: 'Export from Console → Reports → Tradebook → Download CSV.',
    tradebookTemplateId: ZERODHA_TRADEBOOK_TEMPLATE_ID,
  },
]

export function getStockBroker(brokerId) {
  return STOCK_BROKERS.find((broker) => broker.id === brokerId) ?? null
}

export function isSupportedStockBroker(broker) {
  return STOCK_BROKERS.some((option) => option.id === broker)
}

export function resolveTradebookTemplateId(brokerId) {
  return getStockBroker(brokerId)?.tradebookTemplateId ?? null
}
