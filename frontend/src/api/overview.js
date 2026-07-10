import api from '../services/api'

export async function fetchInvestmentProgress() {
  const response = await api.get('/overview/investment-progress')
  return response.data
}

export async function fetchInvestmentProgressBenchmarks() {
  const response = await api.get('/overview/investment-progress/benchmarks')
  return response.data
}
