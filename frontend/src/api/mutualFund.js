import api from '../services/api'

export async function fetchMutualFundTransactions() {
  const response = await api.get('/mutual-fund/transactions')
  return response.data
}

export async function fetchPortfolioHoldings() {
  const response = await api.get('/mutual-fund/holdings')
  return response.data
}

export async function fetchHoldingChart(folio, isin, options = {}) {
  const response = await api.get('/mutual-fund/holdings/chart', {
    params: { folio, isin },
    signal: options.signal,
  })
  return response.data
}

export async function fetchPortfolioReconciliation() {
  const response = await api.get('/mutual-fund/reconciliation')
  return response.data
}

export async function uploadCamsPdf(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/mutual-fund/cams/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function fetchTargetAllocation() {
  const response = await api.get('/mutual-fund/allocation/targets')
  return response.data
}

export async function saveTargetAllocation(payload) {
  const response = await api.put('/mutual-fund/allocation/targets', payload)
  return response.data
}
