import { useEffect, useRef, useState } from 'react'
import { updateProfile, uploadProfilePhoto } from '../../api/profile'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getApiErrorMessage } from '../../utils/apiErrors'
import {
  validateProfileForm,
  validateProfilePhotoFile,
} from '../../utils/formValidation'
import { getUserInitials } from '../../utils/userInitials'
import {
  FormBody,
  FormButton,
  FormCard,
  FormField,
  FormFooter,
  FormInput,
} from '../form'
import BootstrapIcon from '../icons/BootstrapIcon'

function ProfileTab() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [zerodhaClientId, setZerodhaClientId] = useState('')
  const [profilePic, setProfilePic] = useState('')
  const photoInputRef = useRef(null)

  useEffect(() => {
    if (!user) return

    setName(user.name ?? '')
    setEmail(user.email ?? '')
    setPhone(user.phone ?? '')
    setZerodhaClientId(user.zerodha_client_id ?? '')
    setProfilePic(user.profile_pic ?? '')
  }, [user])

  const initials = getUserInitials(name || user?.name)
  const previewPic = profilePic || user?.profile_pic

  const handlePhotoSelect = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const validationMessage = validateProfilePhotoFile(file)
    if (validationMessage) {
      showToast(validationMessage)
      return
    }

    setIsUploadingPhoto(true)

    try {
      const updatedUser = await uploadProfilePhoto(file)
      updateUser(updatedUser)
      setProfilePic(updatedUser.profile_pic ?? '')
      showToast('Profile photo updated.', { type: 'success' })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to upload photo.'))
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateProfileForm({
      name,
      email,
      phone,
      zerodhaClientId,
    })
    if (validationMessage) {
      showToast(validationMessage)
      return
    }

    setIsSaving(true)

    try {
      const updatedUser = await updateProfile({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        zerodha_client_id: zerodhaClientId.trim().toUpperCase() || null,
      })
      updateUser(updatedUser)
      showToast('Profile updated successfully.', { type: 'success' })
    } catch (error) {
      showToast(
        getApiErrorMessage(error, 'Unable to update profile. Please try again.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const isBusy = isSaving || isUploadingPhoto

  return (
    <FormCard onSubmit={handleSubmit} className="w-full border-0 bg-transparent shadow-none">
      <FormBody>
        <div className="profile-photo-row">
          <div className="profile-avatar-preview">
            {previewPic ? (
              <img src={previewPic} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handlePhotoSelect}
              disabled={isBusy}
            />
            <button
              type="button"
              className="profile-change-photo-btn"
              onClick={() => photoInputRef.current?.click()}
              disabled={isBusy}
            >
              <BootstrapIcon icon="bi-upload" className="text-sm" />
              {isUploadingPhoto ? 'Uploading…' : 'Change photo'}
            </button>
          </div>
        </div>

        <div className="profile-fields-grid">
          <FormField label="Client PAN" htmlFor="clientPan">
            <FormInput
              id="clientPan"
              name="clientPan"
              type="text"
              value={user?.client_pan ?? ''}
              readOnly
              disabled
              className="cursor-not-allowed opacity-70"
            />
          </FormField>

          <FormField label="Zerodha client ID" htmlFor="zerodhaClientId">
            <FormInput
              id="zerodhaClientId"
              name="zerodhaClientId"
              type="text"
              value={zerodhaClientId}
              onChange={(event) => setZerodhaClientId(event.target.value.toUpperCase())}
              placeholder="WI0911"
              maxLength={6}
              disabled={isBusy}
            />
          </FormField>

          <FormField label="Name" htmlFor="name">
            <FormInput
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              aria-required="true"
              disabled={isBusy}
            />
          </FormField>

          <FormField label="Email" htmlFor="email">
            <FormInput
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={isBusy}
            />
          </FormField>

          <FormField label="Phone" htmlFor="phone">
            <FormInput
              id="phone"
              name="phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="9876543210"
              disabled={isBusy}
            />
          </FormField>
        </div>
      </FormBody>

      <FormFooter>
        <FormButton disabled={isBusy}>
          {isSaving ? 'Saving…' : 'Save profile'}
        </FormButton>
      </FormFooter>
    </FormCard>
  )
}

export default ProfileTab
