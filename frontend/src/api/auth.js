import api from '../services/api'
import { clearUser, setUser } from '../utils/userStorage'

export async function login(clientPan, password) {
  const response = await api.post('/auth/login', {
    client_pan: clientPan,
    password,
  })
  return response.data
}

export async function fetchCurrentUser() {
  const response = await api.get('/auth/me')
  return response.data
}

export async function logoutRequest() {
  await api.post('/auth/logout')
}

export function applyAuthSession({ user }) {
  setUser(user)
}

export function clearAuthSession() {
  clearUser()
}
