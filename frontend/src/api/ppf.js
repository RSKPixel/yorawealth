import api from '../services/api'

export async function fetchPpfInvestments() {
  const response = await api.get('/ppf/investments')
  return response.data
}

export async function fetchPpfTransactions() {
  const response = await api.get('/ppf/transactions')
  return response.data
}

export async function uploadPpfStatement(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/ppf/statement/upload', formData)

  return response.data
}
