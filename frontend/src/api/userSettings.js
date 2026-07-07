import api from '../services/api'

export async function fetchGeneralSettings() {
  const response = await api.get('/settings/general')
  return response.data
}

export async function updateGeneralSettings(payload) {
  const response = await api.patch('/settings/general', payload)
  return response.data
}
