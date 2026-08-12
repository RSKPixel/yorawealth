import api from '../services/api'

export async function fetchGeneralSettings() {
  const response = await api.get('/settings/general')
  return response.data
}

export async function updateGeneralSettings(payload) {
  const response = await api.patch('/settings/general', payload)
  return response.data
}

export async function fetchPasswordSettings() {
  const response = await api.get('/settings/password')
  return response.data
}

export async function updatePasswordSettings(payload) {
  const response = await api.patch('/settings/password', payload)
  return response.data
}
