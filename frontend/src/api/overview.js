import api from '../services/api'

export async function fetchInvestmentProgress() {
  const response = await api.get('/overview/investment-progress')
  return response.data
}
