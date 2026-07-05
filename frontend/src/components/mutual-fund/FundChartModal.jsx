import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchHoldingChart } from '../../api/mutualFund'
import { getApiErrorMessage } from '../../utils/apiErrors'
import Modal from '../common/Modal'
import BootstrapIcon from '../icons/BootstrapIcon'
import { FUND_CHART_TABS } from './fundChartTabs'
import FundReturnsPanel from './FundReturnsPanel'
import HoldingNavChart from './HoldingNavChart'

function FundChartModal({ row, onClose }) {
  const requestRef = useRef(null)
  const [activeTab, setActiveTab] = useState('chart')
  const [chartData, setChartData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadChart = useCallback(async () => {
    if (requestRef.current) {
      requestRef.current.abort()
    }

    const controller = new AbortController()
    requestRef.current = controller
    setIsLoading(true)
    setError(null)
    setChartData(null)

    try {
      const data = await fetchHoldingChart(row.folio, row.isin, {
        signal: controller.signal,
      })
      if (!controller.signal.aborted) {
        setChartData(data)
      }
    } catch (loadError) {
      if (!controller.signal.aborted) {
        setError(getApiErrorMessage(loadError, 'Unable to load chart.'))
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [row.folio, row.isin])

  useEffect(() => {
    loadChart()
    return () => {
      if (requestRef.current) {
        requestRef.current.abort()
      }
    }
  }, [loadChart])

  return (
    <Modal
      title={row.fund_name}
      titleIcon="bi-graph-up"
      onClose={onClose}
      className="mf-chart-modal"
      ariaLabelledBy="mf-chart-modal-title"
    >
      <div className="mf-chart-modal-body">
        <p className="mf-chart-modal-meta">
          {row.fund_type || row.amc}
          <span className="mf-fund-meta-sep">·</span>
          Folio {row.folio}
          <span className="mf-fund-meta-sep">·</span>
          {row.isin}
        </p>

        <div
          className="mf-chart-modal-tabs"
          role="tablist"
          aria-label="Fund chart sections"
        >
          {FUND_CHART_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`mf-chart-modal-tab${
                activeTab === tab.id ? ' mf-chart-modal-tab-active' : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <BootstrapIcon icon={tab.icon} className="mf-chart-modal-tab-icon" />
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="mf-chart-modal-state">Syncing NAV history…</div>
        )}
        {!isLoading && error && (
          <div className="mf-chart-modal-state mf-chart-modal-error">
            <p>{error}</p>
            <button
              type="button"
              className="shell-page-action-btn mt-3"
              onClick={loadChart}
            >
              Retry sync
            </button>
          </div>
        )}
        {!isLoading && !error && chartData && activeTab === 'chart' && (
          <div className="mf-chart-modal-chart-wrap">
            {chartData.sync_warning && (
              <div className="mf-chart-modal-warning">{chartData.sync_warning}</div>
            )}
            <HoldingNavChart chartData={chartData} size="large" />
          </div>
        )}
        {!isLoading && !error && chartData && activeTab === 'returns' && (
          <div className="mf-chart-modal-returns-wrap">
            {chartData.sync_warning && (
              <div className="mf-chart-modal-warning">{chartData.sync_warning}</div>
            )}
            <FundReturnsPanel navHistory={chartData.nav_history} />
          </div>
        )}
      </div>
    </Modal>
  )
}

export default FundChartModal
