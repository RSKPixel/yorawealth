export const SIDEBAR_PIN_STORAGE_KEY = 'yorawealth_sidebar_pinned'
export const SIDEBAR_HOVER_EXPAND_DELAY_MS = 3000

export function readSidebarPinned() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY) === 'true'
}

export function writeSidebarPinned(pinned) {
  window.localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, pinned ? 'true' : 'false')
}
