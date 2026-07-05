import { createContext, useCallback, useContext, useState } from 'react'
import SettingsModal from '../components/settings/SettingsModal'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)

  const openSettings = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeSettings = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <SettingsContext.Provider value={{ isOpen, openSettings, closeSettings }}>
      {children}
      {isOpen && <SettingsModal onClose={closeSettings} />}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
