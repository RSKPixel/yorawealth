import { useEffect, useState } from 'react'
import { changePassword } from '../../api/profile'
import { fetchPasswordSettings, updatePasswordSettings } from '../../api/userSettings'
import { useToast } from '../../context/ToastContext'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { validatePasswordForm } from '../../utils/formValidation'
import {
  FormBody,
  FormButton,
  FormCard,
  FormField,
  FormFooter,
  FormInput,
} from '../form'
import BootstrapIcon from '../icons/BootstrapIcon'

function PasswordToggleButton({ visible, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
      aria-label={label}
    >
      <BootstrapIcon icon={visible ? 'bi-eye-slash' : 'bi-eye'} />
    </button>
  )
}

function PasswordTab() {
  const { showToast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [camsPassword, setCamsPassword] = useState('')
  const [showCamsPassword, setShowCamsPassword] = useState(false)
  const [isLoadingCamsPassword, setIsLoadingCamsPassword] = useState(true)
  const [isSavingCamsPassword, setIsSavingCamsPassword] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadCamsPassword = async () => {
      try {
        const settings = await fetchPasswordSettings()
        if (!cancelled) {
          setCamsPassword(settings.cams_pdf_password || '')
        }
      } catch (error) {
        if (!cancelled) {
          showToast(getApiErrorMessage(error, 'Unable to load CAMS password.'))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCamsPassword(false)
        }
      }
    }

    loadCamsPassword()

    return () => {
      cancelled = true
    }
  }, [showToast])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validatePasswordForm({
      currentPassword,
      newPassword,
      confirmPassword,
    })

    if (validationMessage) {
      showToast(validationMessage)
      return
    }

    setIsSaving(true)

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('Password updated successfully.', { type: 'success' })
    } catch (error) {
      showToast(
        getApiErrorMessage(error, 'Unable to update password. Please try again.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveCamsPassword = async () => {
    setIsSavingCamsPassword(true)

    try {
      const settings = await updatePasswordSettings({
        cams_pdf_password: camsPassword.trim(),
      })
      setCamsPassword(settings.cams_pdf_password || '')
      showToast('CAMS PDF password saved.', { type: 'success' })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to save CAMS PDF password.'))
    } finally {
      setIsSavingCamsPassword(false)
    }
  }

  return (
    <div className="settings-password-stack">
      <FormCard onSubmit={handleSubmit} className="w-full border-0 bg-transparent shadow-none">
      <FormBody>
        <FormField label="Current password" htmlFor="currentPassword">
          <div className="relative">
            <FormInput
              id="currentPassword"
              name="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter current password"
              className="pr-10"
              aria-required="true"
              disabled={isSaving}
            />
            <PasswordToggleButton
              visible={showCurrentPassword}
              onToggle={() => setShowCurrentPassword((prev) => !prev)}
              label={showCurrentPassword ? 'Hide password' : 'Show password'}
            />
          </div>
        </FormField>

        <FormField label="New password" htmlFor="newPassword">
          <div className="relative">
            <FormInput
              id="newPassword"
              name="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              className="pr-10"
              aria-required="true"
              disabled={isSaving}
            />
            <PasswordToggleButton
              visible={showNewPassword}
              onToggle={() => setShowNewPassword((prev) => !prev)}
              label={showNewPassword ? 'Hide password' : 'Show password'}
            />
          </div>
        </FormField>

        <FormField label="Confirm new password" htmlFor="confirmPassword">
          <div className="relative">
            <FormInput
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat new password"
              className="pr-10"
              aria-required="true"
              disabled={isSaving}
            />
            <PasswordToggleButton
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((prev) => !prev)}
              label={showConfirmPassword ? 'Hide password' : 'Show password'}
            />
          </div>
        </FormField>
      </FormBody>

      <FormFooter>
        <FormButton disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Update password'}
        </FormButton>
      </FormFooter>
    </FormCard>

      <FormCard className="w-full border-0 bg-transparent shadow-none">
        <FormBody>
          <div className="settings-option-copy">
            <p className="settings-option-label">CAMS PDF password</p>
            <p className="settings-option-hint">
              Password used to unlock CAMS mutual fund statement PDFs on import. If left
              empty, lowercase client PAN is tried automatically.
            </p>
          </div>

          <FormField label="CAMS password" htmlFor="camsPassword">
            <div className="relative">
              <FormInput
                id="camsPassword"
                name="camsPassword"
                type={showCamsPassword ? 'text' : 'password'}
                value={camsPassword}
                onChange={(event) => setCamsPassword(event.target.value)}
                placeholder="Enter CAMS PDF password"
                className="pr-10"
                disabled={isLoadingCamsPassword || isSavingCamsPassword}
                maxLength={64}
              />
              <PasswordToggleButton
                visible={showCamsPassword}
                onToggle={() => setShowCamsPassword((prev) => !prev)}
                label={showCamsPassword ? 'Hide CAMS password' : 'Show CAMS password'}
              />
            </div>
          </FormField>
        </FormBody>

        <FormFooter>
          <FormButton
            type="button"
            onClick={handleSaveCamsPassword}
            disabled={isLoadingCamsPassword || isSavingCamsPassword}
          >
            {isSavingCamsPassword ? 'Saving…' : 'Save CAMS password'}
          </FormButton>
        </FormFooter>
      </FormCard>
    </div>
  )
}

export default PasswordTab
