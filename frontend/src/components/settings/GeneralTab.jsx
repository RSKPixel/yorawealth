import { useState } from 'react'
import {
  ROOT_FONT_SIZE_MAX,
  ROOT_FONT_SIZE_MIN,
  ROOT_FONT_SIZE_STEP,
  formatRootFontSizePx,
  readRootFontSizePx,
  writeRootFontSizePx,
} from '../../config/rootFontSize'
import {
  STAR_BRIGHTNESS_MAX,
  STAR_BRIGHTNESS_MIN,
  STAR_BRIGHTNESS_STEP,
  STAR_COUNT_MAX,
  STAR_COUNT_MIN,
  STAR_COUNT_STEP,
  readStarsSettings,
  writeStarsSettings,
} from '../../config/starsBackground'
import { FormBody, FormCard } from '../form'
import BootstrapIcon from '../icons/BootstrapIcon'

function SettingsStepper({
  value,
  min,
  max,
  disabled = false,
  onDecrease,
  onIncrease,
  formatValue,
  ariaLabel,
}) {
  return (
    <div className="settings-stepper" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className="settings-stepper-btn"
        onClick={onDecrease}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${ariaLabel.toLowerCase()}`}
      >
        <BootstrapIcon icon="bi-dash-lg" />
      </button>

      <span className="settings-stepper-value" aria-live="polite">
        {formatValue(value)}
      </span>

      <button
        type="button"
        className="settings-stepper-btn"
        onClick={onIncrease}
        disabled={disabled || value >= max}
        aria-label={`Increase ${ariaLabel.toLowerCase()}`}
      >
        <BootstrapIcon icon="bi-plus-lg" />
      </button>
    </div>
  )
}

function GeneralTab() {
  const [fontSizePx, setFontSizePx] = useState(() => readRootFontSizePx())
  const [starsSettings, setStarsSettings] = useState(() => readStarsSettings())

  const updateStars = (patch) => {
    setStarsSettings(writeStarsSettings(patch))
  }

  return (
    <FormCard>
      <FormBody className="settings-general-body">
        <div className="settings-option-row">
          <div className="settings-option-copy">
            <p className="settings-option-label">Font size</p>
            <p className="settings-option-hint">
              Base text size across the app ({ROOT_FONT_SIZE_MIN}–{ROOT_FONT_SIZE_MAX}px).
            </p>
          </div>

          <SettingsStepper
            value={fontSizePx}
            min={ROOT_FONT_SIZE_MIN}
            max={ROOT_FONT_SIZE_MAX}
            step={ROOT_FONT_SIZE_STEP}
            ariaLabel="Font size"
            formatValue={(value) => `${formatRootFontSizePx(value)}px`}
            onDecrease={() => setFontSizePx(writeRootFontSizePx(fontSizePx - ROOT_FONT_SIZE_STEP))}
            onIncrease={() => setFontSizePx(writeRootFontSizePx(fontSizePx + ROOT_FONT_SIZE_STEP))}
          />
        </div>

        <div className="settings-option-row">
          <div className="settings-option-copy">
            <p className="settings-option-label">Night sky stars</p>
            <p className="settings-option-hint">Animated stars on the app background.</p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={starsSettings.enabled}
            className={`settings-toggle${starsSettings.enabled ? ' settings-toggle-on' : ''}`}
            onClick={() => updateStars({ enabled: !starsSettings.enabled })}
          >
            <span className="settings-toggle-thumb" />
            <span className="sr-only">{starsSettings.enabled ? 'On' : 'Off'}</span>
          </button>
        </div>

        <div className="settings-option-row">
          <div className="settings-option-copy">
            <p className="settings-option-label">Star count</p>
            <p className="settings-option-hint">
              Number of stars ({STAR_COUNT_MIN}–{STAR_COUNT_MAX}).
            </p>
          </div>

          <SettingsStepper
            value={starsSettings.count}
            min={STAR_COUNT_MIN}
            max={STAR_COUNT_MAX}
            disabled={!starsSettings.enabled}
            ariaLabel="Star count"
            formatValue={(value) => String(value)}
            onDecrease={() => updateStars({ count: starsSettings.count - STAR_COUNT_STEP })}
            onIncrease={() => updateStars({ count: starsSettings.count + STAR_COUNT_STEP })}
          />
        </div>

        <div className="settings-option-row">
          <div className="settings-option-copy">
            <p className="settings-option-label">Star brightness</p>
            <p className="settings-option-hint">
              Glow intensity ({STAR_BRIGHTNESS_MIN}–{STAR_BRIGHTNESS_MAX}%).
            </p>
          </div>

          <SettingsStepper
            value={starsSettings.brightness}
            min={STAR_BRIGHTNESS_MIN}
            max={STAR_BRIGHTNESS_MAX}
            disabled={!starsSettings.enabled}
            ariaLabel="Star brightness"
            formatValue={(value) => `${value}%`}
            onDecrease={() =>
              updateStars({ brightness: starsSettings.brightness - STAR_BRIGHTNESS_STEP })
            }
            onIncrease={() =>
              updateStars({ brightness: starsSettings.brightness + STAR_BRIGHTNESS_STEP })
            }
          />
        </div>
      </FormBody>
    </FormCard>
  )
}

export default GeneralTab
