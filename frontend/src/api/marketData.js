import api from '../services/api'

const DAILY_SYNC_STORAGE_KEY = 'dailyMarketSyncDate'

function getIstDateKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
    new Date(),
  )
}

export async function syncNseEod() {
  const response = await api.post('/market-data/nse/eod/sync')
  return response.data
}

export async function syncNseHistorical(period = 3650) {
  const response = await api.post('/market-data/nse/historical/sync', null, {
    params: { period },
  })
  return response.data
}

export async function syncAmfiEod() {
  const response = await api.post('/market-data/amfi/eod/sync')
  return response.data
}

export async function syncAmfiHistorical(period = 1824) {
  const response = await api.post('/market-data/amfi/historical/sync', null, {
    params: { period },
  })
  return response.data
}

export async function syncAllMarketData() {
  const response = await api.post('/market-data/sync/manual')
  return response.data
}

export function triggerDailyMarketDataSync() {
  const today = getIstDateKey()
  if (sessionStorage.getItem(DAILY_SYNC_STORAGE_KEY) === today) {
    return
  }

  sessionStorage.setItem(DAILY_SYNC_STORAGE_KEY, today)
  api.post('/market-data/sync/daily').catch(() => {
    sessionStorage.removeItem(DAILY_SYNC_STORAGE_KEY)
  })
}

export async function fetchMarketDataSyncLogs(limit = 50) {
  const response = await api.get('/market-data/sync/logs', {
    params: { limit },
  })
  return response.data
}
