import api from '../services/api'
import { normalizeRealizedGainRow } from '../utils/capitalGainsFormat'

function normalizeCapitalGainRow(row) {
  return normalizeRealizedGainRow({
    ...row,
    id: row.id,
  })
}

export async function fetchRealizedGains() {
  const response = await api.get('/capital-gains/realized')
  const transactions = (response.data.transactions ?? []).map(normalizeCapitalGainRow)
  return { transactions }
}

export async function fetchCapitalGain(recordId) {
  const response = await api.get(`/capital-gains/${recordId}`)
  return {
    transaction: normalizeCapitalGainRow(response.data.transaction),
    detail: response.data.detail,
  }
}

export async function createCapitalGain(payload) {
  const response = await api.post('/capital-gains', payload)
  return {
    transaction: normalizeCapitalGainRow(response.data.transaction),
    detail: response.data.detail,
  }
}

export async function updateCapitalGain(recordId, payload) {
  const response = await api.put(`/capital-gains/${recordId}`, payload)
  return {
    transaction: normalizeCapitalGainRow(response.data.transaction),
    detail: response.data.detail,
  }
}

export async function deleteCapitalGain(recordId) {
  const response = await api.delete(`/capital-gains/${recordId}`)
  return { detail: response.data.detail }
}
