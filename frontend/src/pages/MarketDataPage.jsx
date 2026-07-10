import { useState } from 'react'
import {
  syncAllMarketData,
  syncAmfiEod,
  syncAmfiHistorical,
  syncNseEod,
  syncNseHistorical,
} from '../api/marketData'
import BootstrapIcon from '../components/icons/BootstrapIcon'
import { useToast } from '../context/ToastContext'
import { getApiErrorMessage } from '../utils/apiErrors'

const AMFI_HISTORICAL_PERIOD = 1824
const NSE_HISTORICAL_PERIOD = 3650

function SyncResultLine({ result }) {
  if (!result) return null
  return <p className="market-data-sync-result">{result}</p>
}

function MarketDataPage() {
  const { showToast } = useToast()
  const [isSyncingAll, setIsSyncingAll] = useState(false)
  const [activeSync, setActiveSync] = useState(null)
  const [results, setResults] = useState({
    amfiEod: null,
    amfiHistorical: null,
    nseEod: null,
    nseHistorical: null,
  })

  const isBusy = isSyncingAll || activeSync != null

  const runSync = async (key, task, formatResult) => {
    setActiveSync(key)
    try {
      const result = await task()
      const summary = formatResult(result)
      setResults((current) => ({ ...current, [key]: summary }))
      showToast(summary, { type: 'success' })
      return result
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to sync market data.'), { type: 'error' })
      throw error
    } finally {
      setActiveSync(null)
    }
  }

  const handleSyncAll = async () => {
    setIsSyncingAll(true)
    try {
      const all = await syncAllMarketData()
      const details = all.details ?? {}

      setResults({
        amfiEod: formatSyncStep(details.amfi_eod, formatAmfiEod),
        amfiHistorical: formatSyncStep(details.amfi_historical, formatAmfiHistorical),
        nseEod: formatSyncStep(details.nse_eod, formatNseEod),
        nseHistorical: formatSyncStep(details.nse_historical, formatNseHistorical),
      })

      const hasWarnings = all.status === 'partial' || all.status === 'failed'
      showToast(all.message ?? 'Market data synced.', {
        type: hasWarnings ? 'error' : 'success',
      })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to sync market data.'), { type: 'error' })
    } finally {
      setIsSyncingAll(false)
    }
  }

  return (
    <div className="shell-page-card mf-page">
      <div className="shell-page-card-header shell-page-card-header-with-actions">
        <div className="mf-page-header-text">
          <h1 className="shell-page-card-title">Market Data</h1>
          <p className="mf-page-subtitle">
            Sync NAV and stock price history for portfolio valuations and charts.
          </p>
        </div>
        <div className="mf-page-header-actions">
          <button
            type="button"
            className="shell-page-action-btn market-data-sync-all-btn"
            onClick={handleSyncAll}
            disabled={isBusy}
          >
            <BootstrapIcon
              icon={isSyncingAll ? 'bi-arrow-repeat' : 'bi-cloud-download'}
              className={isSyncingAll ? 'animate-spin' : undefined}
            />
            {isSyncingAll ? 'Syncing all…' : 'Sync all'}
          </button>
        </div>
      </div>

      <div className="shell-page-card-body mf-page-body market-data-sections">
        <section className="market-data-section">
          <div className="market-data-section-header">
            <div>
              <h2 className="market-data-section-title">AMFI latest NAV</h2>
              <p className="market-data-section-text">
                Downloads NAVAll.txt and stores scheme codes, ISINs, and latest NAV.
              </p>
              <SyncResultLine result={results.amfiEod} />
            </div>
            <button
              type="button"
              className="shell-page-action-btn"
              onClick={() =>
                runSync('amfiEod', syncAmfiEod, formatAmfiEod)
              }
              disabled={isBusy}
            >
              {activeSync === 'amfiEod' ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </section>

        <section className="market-data-section">
          <div className="market-data-section-header">
            <div>
              <h2 className="market-data-section-title">AMFI historical NAV</h2>
              <p className="market-data-section-text">
                Downloads NAV history for your mutual fund holdings (
                {AMFI_HISTORICAL_PERIOD} days).
              </p>
              <SyncResultLine result={results.amfiHistorical} />
            </div>
            <button
              type="button"
              className="shell-page-action-btn"
              onClick={() =>
                runSync(
                  'amfiHistorical',
                  () => syncAmfiHistorical(AMFI_HISTORICAL_PERIOD),
                  formatAmfiHistorical,
                )
              }
              disabled={isBusy}
            >
              {activeSync === 'amfiHistorical' ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </section>

        <section className="market-data-section">
          <div className="market-data-section-header">
            <div>
              <h2 className="market-data-section-title">NSE end-of-day prices</h2>
              <p className="market-data-section-text">
                Downloads the latest NSE bhavcopy for current stock valuations.
              </p>
              <SyncResultLine result={results.nseEod} />
            </div>
            <button
              type="button"
              className="shell-page-action-btn"
              onClick={() =>
                runSync('nseEod', syncNseEod, formatNseEod)
              }
              disabled={isBusy}
            >
              {activeSync === 'nseEod' ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </section>

        <section className="market-data-section">
          <div className="market-data-section-header">
            <div>
              <h2 className="market-data-section-title">NSE historical prices</h2>
              <p className="market-data-section-text">
                Downloads price history for your stock holdings ({NSE_HISTORICAL_PERIOD}{' '}
                days).
              </p>
              <SyncResultLine result={results.nseHistorical} />
            </div>
            <button
              type="button"
              className="shell-page-action-btn"
              onClick={() =>
                runSync(
                  'nseHistorical',
                  () => syncNseHistorical(NSE_HISTORICAL_PERIOD),
                  formatNseHistorical,
                )
              }
              disabled={isBusy}
            >
              {activeSync === 'nseHistorical' ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function formatSyncStep(step, formatter) {
  if (!step) {
    return null
  }

  if (step.result && formatter) {
    return formatter({ ...step.result, errors: step.errors ?? [] })
  }

  return step.message ?? step.status
}

function formatAmfiEod(result) {
  return `${result.rows_processed} schemes · ${result.created_count} created · ${result.updated_count} updated`
}

function formatAmfiHistorical(result) {
  const warning =
    result.errors?.length > 0 ? ` · ${result.errors.length} warnings` : ''
  return `${result.isins.length} schemes · ${result.rows_processed} rows${warning}`
}

function formatNseEod(result) {
  return `${result.trade_date || result.bhavdate} · ${result.rows_processed} symbols · ${result.created_count} created · ${result.updated_count} updated`
}

function formatNseHistorical(result) {
  const warning =
    result.errors?.length > 0 ? ` · ${result.errors.length} warnings` : ''
  return `${result.symbols.length} symbols · ${result.rows_processed} rows${warning}`
}

export default MarketDataPage
