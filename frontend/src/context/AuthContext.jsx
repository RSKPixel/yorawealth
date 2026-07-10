import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  applyAuthSession,
  clearAuthSession,
  fetchCurrentUser,
  login as loginRequest,
  logoutRequest,
} from '../api/auth'
import { triggerDailyMarketDataSync } from '../api/marketData'
import { clearLegacyTokenStorage, getUser } from '../utils/userStorage'

const AuthContext = createContext(null)

function scheduleDailyMarketDataSync() {
  triggerDailyMarketDataSync()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser())
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    clearLegacyTokenStorage()

    async function restoreSession() {
      try {
        const currentUser = await fetchCurrentUser()
        applyAuthSession({ user: currentUser })
        setUser(currentUser)
        scheduleDailyMarketDataSync()
      } catch {
        clearAuthSession()
        setUser(null)
      } finally {
        setIsInitializing(false)
      }
    }

    restoreSession()
  }, [])

  const login = useCallback(async (clientPan, password) => {
    setIsLoading(true)
    try {
      const data = await loginRequest(clientPan, password)
      applyAuthSession(data)
      setUser(data.user)
      scheduleDailyMarketDataSync()
      return data
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      clearAuthSession()
      setUser(null)
    }
  }, [])

  const updateUser = useCallback((updatedUser) => {
    applyAuthSession({ user: updatedUser })
    setUser(updatedUser)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isInitializing,
      isAuthenticated: Boolean(user),
      login,
      logout,
      updateUser,
    }),
    [user, isLoading, isInitializing, login, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
