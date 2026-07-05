import { createContext, useCallback, useContext, useRef, useState } from 'react'
import ToastContainer from '../components/common/ToastContainer'

const TOAST_EXIT_MS = 350
export const TOAST_DEFAULT_DURATION_MS = 3000
export const TOAST_MAX_VISIBLE = 3

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toastsRef = useRef(toasts)
  const timersRef = useRef(new Map())

  toastsRef.current = toasts

  const dismissToast = useCallback((id) => {
    const toast = toastsRef.current.find((entry) => entry.id === id)
    if (!toast || toast.exiting) return

    const timers = timersRef.current.get(id)
    if (timers?.auto) window.clearTimeout(timers.auto)

    setToasts((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, exiting: true } : entry,
      ),
    )

    timersRef.current.set(id, {
      remove: window.setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== id))
        timersRef.current.delete(id)
      }, TOAST_EXIT_MS),
    })
  }, [])

  const showToast = useCallback(
    (message, options = {}) => {
      const id = crypto.randomUUID()
      const type = options.type ?? 'error'
      const duration = options.duration ?? TOAST_DEFAULT_DURATION_MS
      const current = toastsRef.current

      if (current.length >= TOAST_MAX_VISIBLE) {
        const oldest = current.find((entry) => !entry.exiting) ?? current[0]
        if (oldest) dismissToast(oldest.id)
      }

      setToasts((prev) => [...prev, { id, message, type, exiting: false }])

      if (duration > 0) {
        const auto = window.setTimeout(() => {
          dismissToast(id)
        }, duration)

        timersRef.current.set(id, { auto })
      }

      return id
    },
    [dismissToast],
  )

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
