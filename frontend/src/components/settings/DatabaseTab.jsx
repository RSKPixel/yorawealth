import { useEffect, useState } from 'react'
import { fetchDatabaseSettings } from '../../api/userSettings'
import { useToast } from '../../context/ToastContext'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { FormBody, FormCard } from '../form'

function DatabaseTab() {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await fetchDatabaseSettings()
        if (!cancelled) {
          setSettings(data)
        }
      } catch (error) {
        if (!cancelled) {
          showToast(getApiErrorMessage(error, 'Unable to load database settings.'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [showToast])

  return (
    <FormCard>
      <FormBody className="settings-general-body">
        <div className="settings-option-copy">
          <p className="settings-option-label">Connection string</p>
          <p className="settings-option-hint">
            Active MySQL connection used by the API. Password is masked.
          </p>
        </div>

        {isLoading ? (
          <p className="settings-option-hint">Loading…</p>
        ) : settings ? (
          <>
            <input
              type="text"
              className="form-input font-mono text-xs"
              value={settings.connection_string}
              readOnly
              autoComplete="new-password"
              data-1p-ignore="true"
              data-lpignore="true"
              aria-label="Database connection string"
              onFocus={(event) => event.target.select()}
            />

            <div className="settings-option-row">
              <div className="settings-option-copy">
                <p className="settings-option-label">Host</p>
                <p className="settings-option-hint">{settings.host}</p>
              </div>
            </div>

            <div className="settings-option-row">
              <div className="settings-option-copy">
                <p className="settings-option-label">Port</p>
                <p className="settings-option-hint">{settings.port}</p>
              </div>
            </div>

            <div className="settings-option-row">
              <div className="settings-option-copy">
                <p className="settings-option-label">User</p>
                <p className="settings-option-hint">{settings.user}</p>
              </div>
            </div>

            <div className="settings-option-row">
              <div className="settings-option-copy">
                <p className="settings-option-label">Database</p>
                <p className="settings-option-hint">{settings.database}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="settings-option-hint">Database settings unavailable.</p>
        )}
      </FormBody>
    </FormCard>
  )
}

export default DatabaseTab
