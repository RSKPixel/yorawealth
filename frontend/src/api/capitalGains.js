import api from '../services/api'
import { normalizeRealizedGainRow } from '../utils/capitalGainsFormat'

export async function fetchRealizedGains() {
  const response = await api.get('/capital-gains/realized')
  const transactions = (response.data.transactions ?? []).map(normalizeRealizedGainRow)
  return { transactions }
}
