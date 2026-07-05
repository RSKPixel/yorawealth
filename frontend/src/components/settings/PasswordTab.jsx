import { useState } from 'react'
import { changePassword } from '../../api/profile'
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

  return (
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
  )
}

export default PasswordTab
