import api from '../services/api'

export async function updateProfile(payload) {
  const response = await api.patch('/auth/profile', payload)
  return response.data
}

export async function changePassword(payload) {
  const response = await api.patch('/auth/profile/password', payload)
  return response.data
}

export async function uploadProfilePhoto(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/auth/profile/photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}
