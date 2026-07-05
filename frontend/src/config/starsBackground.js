export const STARS_SETTINGS_STORAGE_KEY = 'yorawealth_stars_settings'
export const STARS_SETTINGS_CHANGE_EVENT = 'yorawealth-stars-settings-change'

export const STAR_COUNT_MIN = 120
export const STAR_COUNT_MAX = 180
export const STAR_COUNT_STEP = 10
export const STAR_COUNT_DEFAULT = 150

export const STAR_BRIGHTNESS_MIN = 20
export const STAR_BRIGHTNESS_MAX = 100
export const STAR_BRIGHTNESS_STEP = 5
export const STAR_BRIGHTNESS_DEFAULT = 40

const DEFAULT_SETTINGS = {
  enabled: true,
  count: STAR_COUNT_DEFAULT,
  brightness: STAR_BRIGHTNESS_DEFAULT,
}

function clampCount(count) {
  return Math.min(STAR_COUNT_MAX, Math.max(STAR_COUNT_MIN, Math.round(count)))
}

function clampBrightness(brightness) {
  return Math.min(
    STAR_BRIGHTNESS_MAX,
    Math.max(STAR_BRIGHTNESS_MIN, Math.round(brightness)),
  )
}

export function readStarsSettings() {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS }

  const raw = window.localStorage.getItem(STARS_SETTINGS_STORAGE_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }

  try {
    const parsed = JSON.parse(raw)
    return {
      enabled: parsed.enabled !== false,
      count: clampCount(parsed.count ?? STAR_COUNT_DEFAULT),
      brightness: clampBrightness(parsed.brightness ?? STAR_BRIGHTNESS_DEFAULT),
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function applyStarsBrightness(brightness) {
  if (typeof document === 'undefined') return

  const factor = clampBrightness(brightness) / 100
  document.documentElement.style.setProperty('--stars-brightness', String(factor))
}

export function writeStarsSettings(patch) {
  const next = {
    ...readStarsSettings(),
    ...patch,
  }

  if (patch.count != null) {
    next.count = clampCount(patch.count)
  }
  if (patch.brightness != null) {
    next.brightness = clampBrightness(patch.brightness)
  }
  if (patch.enabled != null) {
    next.enabled = Boolean(patch.enabled)
  }

  window.localStorage.setItem(STARS_SETTINGS_STORAGE_KEY, JSON.stringify(next))
  applyStarsBrightness(next.brightness)
  window.dispatchEvent(new CustomEvent(STARS_SETTINGS_CHANGE_EVENT))
  return next
}
