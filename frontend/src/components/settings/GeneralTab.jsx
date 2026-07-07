import { useEffect, useState } from 'react'
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
import { fetchGeneralSettings, updateGeneralSettings } from '../../api/userSettings'
import { useToast } from '../../context/ToastContext'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { DEFAULT_BANK_STATEMENT_NORMALIZATION_PROMPT } from '../../constants/bankStatementNormalizationPrompt'
import { FormBody, FormButton, FormCard, FormFooter } from '../form'
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
  const { showToast } = useToast()
  const [fontSizePx, setFontSizePx] = useState(() => readRootFontSizePx())
  const [starsSettings, setStarsSettings] = useState(() => readStarsSettings())
  const [bankPrompt, setBankPrompt] = useState(DEFAULT_BANK_STATEMENT_NORMALIZATION_PROMPT)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true)
  const [isSavingPrompt, setIsSavingPrompt] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadPrompt = async () => {
      try {
        const settings = await fetchGeneralSettings()
        if (!cancelled) {
          setBankPrompt(settings.bank_statement_normalization_prompt)
        }
      } catch (error) {
        if (!cancelled) {
          showToast(
            getApiErrorMessage(error, 'Unable to load bank statement prompt.'),
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPrompt(false)
        }
      }
    }

    loadPrompt()

    return () => {
      cancelled = true
    }
  }, [showToast])

  const updateStars = (patch) => {
    setStarsSettings(writeStarsSettings(patch))
  }

  const handleSavePrompt = async () => {
    const trimmedPrompt = bankPrompt.trim()
    if (!trimmedPrompt) {
      showToast('Prompt cannot be empty.', { type: 'error' })
      return
    }

    setIsSavingPrompt(true)
    try {
      const settings = await updateGeneralSettings({
        bank_statement_normalization_prompt: trimmedPrompt,
      })
      setBankPrompt(settings.bank_statement_normalization_prompt)
      showToast('Bank statement prompt saved.', { type: 'success' })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to save bank statement prompt.'))
    } finally {
      setIsSavingPrompt(false)
    }
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

        <div className="settings-prompt-section">
          <div className="settings-option-copy">
            <p className="settings-option-label">ChatGPT bank statement normalization prompt</p>
            <p className="settings-option-hint">
              Customize the prompt used when normalizing bank statements in ChatGPT before
              importing CSV here.
            </p>
          </div>

          <textarea
            id="bank-statement-normalization-prompt"
            className="form-input settings-prompt-textarea"
            value={bankPrompt}
            onChange={(event) => setBankPrompt(event.target.value)}
            rows={12}
            disabled={isLoadingPrompt || isSavingPrompt}
            spellCheck={false}
          />

          <FormFooter className="settings-prompt-footer">
            <FormButton
              type="button"
              onClick={handleSavePrompt}
              disabled={isLoadingPrompt || isSavingPrompt}
            >
              <BootstrapIcon
                icon={isSavingPrompt ? 'bi-arrow-repeat' : 'bi-check-lg'}
                className={isSavingPrompt ? 'animate-spin' : undefined}
              />
              {isSavingPrompt ? 'Saving…' : 'Save prompt'}
            </FormButton>
          </FormFooter>
        </div>
      </FormBody>
    </FormCard>
  )
}

export default GeneralTab
