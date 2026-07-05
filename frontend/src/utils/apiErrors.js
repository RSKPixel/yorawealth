export function getApiErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0].msg || fallback
  }

  return fallback
}
