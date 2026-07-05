import api from '../services/api'

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

export async function syncAllMarketData({
  amfiPeriod = 1824,
  nsePeriod = 3650,
} = {}) {
  const amfiEod = await syncAmfiEod()
  const amfiHistorical = await syncAmfiHistorical(amfiPeriod)
  const nseEod = await syncNseEod()
  const nseHistorical = await syncNseHistorical(nsePeriod)

  return {
    amfiEod,
    amfiHistorical,
    nseEod,
    nseHistorical,
  }
}
