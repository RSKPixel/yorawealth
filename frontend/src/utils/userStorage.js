const USER_KEY = 'yorawealth_user'

export function getUser() {
  const user = localStorage.getItem(USER_KEY)
  return user ? JSON.parse(user) : null
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeUser() {
  localStorage.removeItem(USER_KEY)
}

export function clearUser() {
  removeUser()
}

export function clearLegacyTokenStorage() {
  localStorage.removeItem('access_token')
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax'
}
