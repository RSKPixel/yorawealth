export const ROOT_FONT_SIZE_STORAGE_KEY = 'yorawealth_root_font_size_px'
export const ROOT_FONT_SIZE_MIN = 18
export const ROOT_FONT_SIZE_MAX = 20
export const ROOT_FONT_SIZE_STEP = 0.25
export const ROOT_FONT_SIZE_DEFAULT = ROOT_FONT_SIZE_MIN

function normalizeRootFontSize(px) {
  return Math.round(px * 4) / 4
}

export function clampRootFontSize(px) {
  return normalizeRootFontSize(
    Math.min(ROOT_FONT_SIZE_MAX, Math.max(ROOT_FONT_SIZE_MIN, px)),
  )
}

export function formatRootFontSizePx(px) {
  const normalized = clampRootFontSize(px)
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(2).replace(/0+$/, '')
}

export function readRootFontSizePx() {
  if (typeof window === 'undefined') return ROOT_FONT_SIZE_DEFAULT

  const raw = window.localStorage.getItem(ROOT_FONT_SIZE_STORAGE_KEY)
  if (raw == null) return ROOT_FONT_SIZE_DEFAULT

  const parsed = Number.parseFloat(raw)
  if (Number.isNaN(parsed)) return ROOT_FONT_SIZE_DEFAULT

  return clampRootFontSize(parsed)
}

export function applyRootFontSizePx(px) {
  if (typeof document === 'undefined') return

  const clamped = clampRootFontSize(px)
  document.documentElement.style.fontSize = `${clamped}px`
}

export function writeRootFontSizePx(px) {
  const clamped = clampRootFontSize(px)
  window.localStorage.setItem(ROOT_FONT_SIZE_STORAGE_KEY, String(clamped))
  applyRootFontSizePx(clamped)
  return clamped
}
