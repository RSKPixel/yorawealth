import api from '../services/api'

export async function fetchStockTransactions() {
  const response = await api.get('/stocks/transactions')
  return response.data
}

export async function fetchStockHoldings() {
  const response = await api.get('/stocks/holdings')
  return response.data
}

export async function uploadTradebook(file, broker) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('broker', broker)

  const response = await api.post('/stocks/tradebook/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function createManualTrade(payload) {
  const response = await api.post('/stocks/transactions/manual', payload)
  return response.data
}

export async function updateManualTrade(tradeId, payload) {
  const response = await api.put(`/stocks/transactions/manual/${tradeId}`, payload)
  return response.data
}

export async function deleteManualTrade(tradeId) {
  const response = await api.delete(`/stocks/transactions/manual/${tradeId}`)
  return response.data
}
