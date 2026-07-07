const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/
const ZERODHA_CLIENT_ID_PATTERN = /^[A-Z]{2}\d{4}$/
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_PHOTO_BYTES = 1 * 1024 * 1024
const ALLOWED_CAMS_PDF_TYPE = 'application/pdf'
const MAX_CAMS_PDF_BYTES = 10 * 1024 * 1024
const ALLOWED_TRADEBOOK_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_TRADEBOOK_BYTES = 10 * 1024 * 1024
const ALLOWED_PPF_STATEMENT_TYPES = [
  'application/vnd.ms-excel',
  'application/octet-stream',
]
const MAX_PPF_STATEMENT_BYTES = 10 * 1024 * 1024
const ALLOWED_BANK_STATEMENT_TYPES = ['text/csv', 'application/csv', 'application/octet-stream']
const MAX_BANK_STATEMENT_BYTES = 10 * 1024 * 1024

export function validateCamsPdfFile(file) {
  if (!file) {
    return 'Please select a PDF file.'
  }

  if (file.type !== ALLOWED_CAMS_PDF_TYPE) {
    return 'Please select a PDF file.'
  }

  if (file.size > MAX_CAMS_PDF_BYTES) {
    return 'PDF must be 10 MB or smaller.'
  }

  return null
}

export function validateTradebookFile(file, templateId = 'zerodha_tradebook_csv') {
  if (!file) {
    return 'Please select a tradebook file.'
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  const isZerodhaCsv = templateId === 'zerodha_tradebook_csv'

  if (isZerodhaCsv) {
    const isCsv =
      file.type === 'text/csv' ||
      file.type === 'application/vnd.ms-excel' ||
      extension === 'csv'

    if (!isCsv) {
      return 'Please select a CSV file.'
    }
  } else {
    const typeAllowed =
      ALLOWED_TRADEBOOK_TYPES.includes(file.type) ||
      ['csv', 'xls', 'xlsx'].includes(extension ?? '')

    if (!typeAllowed) {
      return 'Please select a CSV or Excel file.'
    }
  }

  if (file.size > MAX_TRADEBOOK_BYTES) {
    return 'File must be 10 MB or smaller.'
  }

  return null
}

export function validatePpfStatementFile(file) {
  if (!file) {
    return 'Please select a PPF statement file.'
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  const typeAllowed =
    ALLOWED_PPF_STATEMENT_TYPES.includes(file.type) || extension === 'xls'

  if (!typeAllowed) {
    return 'Please select a PPF statement Excel (.xls) file.'
  }

  if (file.size > MAX_PPF_STATEMENT_BYTES) {
    return 'File must be 10 MB or smaller.'
  }

  return null
}

export function validateBankStatementFile(file) {
  if (!file) {
    return 'Please select a bank statement file.'
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  const typeAllowed =
    ALLOWED_BANK_STATEMENT_TYPES.includes(file.type) || extension === 'csv'

  if (!typeAllowed) {
    return 'Please select a CSV bank statement with date, desc, ref, debit, credit columns.'
  }

  if (file.size > MAX_BANK_STATEMENT_BYTES) {
    return 'File must be 10 MB or smaller.'
  }

  return null
}

export function validateProfilePhotoFile(file) {
  if (!file) {
    return 'Please select a photo.'
  }

  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return 'Please select a JPG, PNG, WEBP, or GIF image.'
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return 'Image must be 1 MB or smaller.'
  }

  return null
}

export function validateLoginForm({ clientPan, password }) {
  const pan = clientPan.trim().toUpperCase()

  if (!pan) {
    return 'Client PAN is required.'
  }

  if (!PAN_PATTERN.test(pan)) {
    return 'Enter a valid Client PAN (e.g. ABCDE1234F).'
  }

  if (!password) {
    return 'Password is required.'
  }

  return null
}

export function validateProfileForm({ name, email, phone, zerodhaClientId }) {
  if (!name?.trim()) {
    return 'Name is required.'
  }

  const trimmedEmail = email?.trim()
  if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
    return 'Enter a valid email address.'
  }

  const trimmedPhone = phone?.trim()
  if (trimmedPhone && !PHONE_PATTERN.test(trimmedPhone)) {
    return 'Enter a valid phone number.'
  }

  const trimmedClientId = zerodhaClientId?.trim().toUpperCase()
  if (trimmedClientId && !ZERODHA_CLIENT_ID_PATTERN.test(trimmedClientId)) {
    return 'Enter a valid Zerodha client ID (e.g. WI0911).'
  }

  return null
}

export function validatePasswordForm({
  currentPassword,
  newPassword,
  confirmPassword,
}) {
  if (!currentPassword) {
    return 'Current password is required.'
  }

  if (!newPassword) {
    return 'Enter a new password.'
  }

  if (newPassword.length < 8) {
    return 'New password must be at least 8 characters.'
  }

  if (newPassword !== confirmPassword) {
    return 'New passwords do not match.'
  }

  return null
}
