export function getApiErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') {
    if (detail === 'Not Found' || detail === 'Internal Server Error') {
      return fallback
    }
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0].msg || fallback
  }

  return fallback
}
