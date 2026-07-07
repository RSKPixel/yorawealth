import api from '../services/api'

const IMPORT_STAGES = ['uploading', 'received', 'parsing', 'saving', 'complete']

function parseSseEvents(responseText) {
  const events = []
  const chunks = responseText.split('\n\n')

  for (const chunk of chunks) {
    const line = chunk.trim()
    if (!line.startsWith('data: ')) continue

    try {
      events.push(JSON.parse(line.slice(6)))
    } catch {
      // Ignore partial SSE chunks while the stream is still open.
    }
  }

  return events
}

function parseXhrError(xhr) {
  const events = parseSseEvents(xhr.responseText)
  const errorEvent = [...events].reverse().find((event) => event.stage === 'error')
  if (errorEvent?.message) {
    return errorEvent.message
  }

  try {
    const payload = JSON.parse(xhr.responseText)
    if (payload?.detail) {
      return typeof payload.detail === 'string' ? payload.detail : 'Unable to import bank statement.'
    }
  } catch {
    // Fall through to generic message.
  }

  return 'Unable to import bank statement.'
}

export async function fetchBankTransactions({ bankAccountId } = {}) {
  const params = {}
  if (bankAccountId != null) {
    params.bank_account_id = bankAccountId
  }

  const response = await api.get('/bank-transactions', { params })
  return response.data
}

export function uploadBankStatementWithProgress(bankAccountId, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/bank-transactions/upload/stream')
    xhr.withCredentials = true

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return

      const uploadRatio = event.loaded / event.total
      onProgress({
        stage: 'uploading',
        message: `Uploading file… ${Math.round(uploadRatio * 100)}%`,
        percent: Math.round(uploadRatio * 25),
      })
    })

    xhr.onreadystatechange = () => {
      if (xhr.readyState >= 3 && xhr.status === 200) {
        const events = parseSseEvents(xhr.responseText)
        const latest = events[events.length - 1]
        if (latest) {
          onProgress(latest)
        }
      }

      if (xhr.readyState !== 4) return

      if (xhr.status === 0) {
        reject(new Error('Import was cancelled.'))
        return
      }

      if (xhr.status >= 400) {
        reject(new Error(parseXhrError(xhr)))
        return
      }

      const events = parseSseEvents(xhr.responseText)
      const completeEvent = [...events].reverse().find((event) => event.stage === 'complete')
      const errorEvent = [...events].reverse().find((event) => event.stage === 'error')

      if (completeEvent) {
        resolve({
          detail: completeEvent.detail,
          filename: completeEvent.filename,
          created_count: completeEvent.created_count,
          excluded_count: completeEvent.excluded_count,
        })
        return
      }

      if (errorEvent) {
        reject(new Error(errorEvent.message || 'Unable to import bank statement.'))
        return
      }

      reject(new Error('Import did not complete.'))
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bank_account_id', String(bankAccountId))
    xhr.send(formData)
  })
}

export { IMPORT_STAGES }

// Keep a simple upload helper for any callers that do not need progress.
export async function uploadBankStatement(bankAccountId, file) {
  return uploadBankStatementWithProgress(bankAccountId, file, () => {})
}
