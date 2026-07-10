import { useCallback, useEffect, useState } from 'react'
import { fetchMarketDataSyncLogs } from '../../api/marketData'
import { useToast } from '../../context/ToastContext'
import { getApiErrorMessage } from '../../utils/apiErrors'

const STATUS_LABELS = {
  running: 'Running',
  success: 'Success',
  partial: 'Partial',
  failed: 'Failed',
  skipped: 'Skipped',
}

const TRIGGER_LABELS = {
  daily: 'Daily',
  manual: 'Manual',
}

function formatTimestamp(value) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatStepSummary(details) {
  if (!details || typeof details !== 'object') {
    return null
  }

  return Object.entries(details)
    .map(([key, step]) => {
      if (!step || typeof step !== 'object') {
        return null
      }

      const label = key.replaceAll('_', ' ')
      const errors = step.errors?.length ? ` (${step.errors.length} warnings)` : ''
      return `${label}: ${step.status ?? 'unknown'}${errors}`
    })
    .filter(Boolean)
    .join(' · ')
}

function LogTab() {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [lastDaily, setLastDaily] = useState(null)

  const loadLogs = useCallback(async () => {
    setIsLoading(true)

    try {
      const result = await fetchMarketDataSyncLogs()
      setLogs(result.logs ?? [])
      setLastDaily(result.last_daily ?? null)
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to load sync logs.'))
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  return (
    <div className="settings-log-tab">
      <div className="settings-log-summary">
        <div className="settings-log-summary-copy">
          <p className="settings-option-label">Last daily sync</p>
          <p className="settings-option-hint">
            {lastDaily
              ? `${formatTimestamp(lastDaily.started_at)} · ${STATUS_LABELS[lastDaily.status] ?? lastDaily.status}`
              : 'No daily sync recorded yet.'}
          </p>
        </div>
        {lastDaily && (
          <span className={`settings-log-status settings-log-status-${lastDaily.status}`}>
            {STATUS_LABELS[lastDaily.status] ?? lastDaily.status}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="settings-log-loading">Loading sync logs…</div>
      ) : logs.length === 0 ? (
        <div className="settings-log-empty">No sync activity yet.</div>
      ) : (
        <div className="settings-log-table-wrap">
          <table className="settings-log-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Trigger</th>
                <th scope="col">Status</th>
                <th scope="col">Summary</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const stepSummary = formatStepSummary(log.details)

                return (
                  <tr key={log.id}>
                    <td>{formatTimestamp(log.started_at)}</td>
                    <td>{TRIGGER_LABELS[log.trigger] ?? log.trigger}</td>
                    <td>
                      <span className={`settings-log-status settings-log-status-${log.status}`}>
                        {STATUS_LABELS[log.status] ?? log.status}
                      </span>
                    </td>
                    <td>
                      <div className="settings-log-summary-cell">
                        <span>{log.summary ?? '—'}</span>
                        {stepSummary && (
                          <span className="settings-log-step-summary">{stepSummary}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default LogTab
