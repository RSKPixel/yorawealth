import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchMutualFundTransactions,
  fetchPortfolioHoldings,
  uploadCamsPdf,
} from '../api/mutualFund'
import CamsTransactionsTable from '../components/mutual-fund/CamsTransactionsTable'
import MfEmptyState from '../components/mutual-fund/MfEmptyState'
import PortfolioPageHeader from '../components/layout/PortfolioPageHeader'
import PortfolioHoldingsTable from '../components/mutual-fund/PortfolioHoldingsTable'
import PortfolioSummaryCards from '../components/mutual-fund/PortfolioSummaryCards'
import AllocationModal from '../components/mutual-fund/AllocationModal'
import Tooltip from '../components/common/Tooltip'
import { useToast } from '../context/ToastContext'
import { getApiErrorMessage } from '../utils/apiErrors'
import { validateCamsPdfFile } from '../utils/formValidation'
import BootstrapIcon from '../components/icons/BootstrapIcon'

function MutualFundPage() {
  const { showToast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [holdings, setHoldings] = useState([])
  const [holdingsSummary, setHoldingsSummary] = useState(null)
  const [showTransactions, setShowTransactions] = useState(false)
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const fileInputRef = useRef(null)

  const loadPortfolioData = useCallback(async () => {
    try {
      const [transactionsResult, holdingsResult] = await Promise.all([
        fetchMutualFundTransactions(),
        fetchPortfolioHoldings(),
      ])
      setTransactions(transactionsResult.transactions ?? [])
      setHoldings(holdingsResult.holdings ?? [])
      setHoldingsSummary({
        total_invested: holdingsResult.total_invested ?? 0,
        total_current_value: holdingsResult.total_current_value ?? 0,
        total_unrealized_gain: holdingsResult.total_unrealized_gain ?? 0,
        xirr: holdingsResult.xirr ?? null,
      })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to load mutual fund data.'))
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadPortfolioData()
  }, [loadPortfolioData])

  const openFilePicker = () => fileInputRef.current?.click()

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const validationMessage = validateCamsPdfFile(file)
    if (validationMessage) {
      showToast(validationMessage)
      return
    }

    setIsUploading(true)

    try {
      const result = await uploadCamsPdf(file)
      await loadPortfolioData()
      showToast(result.detail, { type: 'success' })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to upload CAMS statement.'))
    } finally {
      setIsUploading(false)
    }
  }

  const hasHoldings = holdings.length > 0

  return (
    <div className="mf-page mf-page-layout">
      <PortfolioPageHeader
        title="Mutual Fund"
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            {hasHoldings && (
              <>
                <Tooltip label="Allocation">
                  <button
                    type="button"
                    className="shell-page-icon-btn"
                    onClick={() => setShowAllocationModal(true)}
                    aria-label="Allocation"
                  >
                    <BootstrapIcon icon="bi-pie-chart" />
                  </button>
                </Tooltip>
                <Tooltip label={isUploading ? 'Uploading CAMS PDF…' : 'Upload CAMS PDF'}>
                  <button
                    type="button"
                    className="shell-page-icon-btn"
                    onClick={openFilePicker}
                    disabled={isUploading}
                    aria-label={isUploading ? 'Uploading CAMS PDF' : 'Upload CAMS PDF'}
                  >
                    <BootstrapIcon
                      icon={isUploading ? 'bi-arrow-repeat' : 'bi-upload'}
                      className={isUploading ? 'animate-spin' : undefined}
                    />
                  </button>
                </Tooltip>
              </>
            )}
          </>
        }
      />

      {(isLoading || hasHoldings) && (
        <div className="mf-page-summary" aria-busy={isLoading}>
          {isLoading ? (
            <div className="mf-summary-grid mf-loading-grid">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="mf-stat-card mf-stat-skeleton" />
              ))}
            </div>
          ) : (
            <PortfolioSummaryCards summary={holdingsSummary} holdings={holdings} />
          )}
        </div>
      )}

      {!isLoading && !hasHoldings && (
        <MfEmptyState onUpload={openFilePicker} isUploading={isUploading} />
      )}

      {(isLoading || hasHoldings) && (
        <div className="mf-page-holdings" aria-busy={isLoading}>
          {isLoading ? (
            <div className="mf-loading">
              <div className="mf-table-skeleton" />
            </div>
          ) : (
            <section className="mf-section">
              <div className="mf-section-header">
                <h2 className="mf-section-title">Holdings</h2>
                <span className="mf-section-badge">{holdings.length} funds</span>
              </div>
              <PortfolioHoldingsTable
                holdings={holdings}
                totalCurrentValue={holdingsSummary?.total_current_value ?? 0}
              />
            </section>
          )}
        </div>
      )}

      {!isLoading && hasHoldings && transactions.length > 0 && (
        <div className="mf-page-transactions">
          <section className="mf-section">
            <button
              type="button"
              className="mf-section-toggle"
              onClick={() => setShowTransactions((open) => !open)}
              aria-expanded={showTransactions}
            >
              <div className="mf-section-header mf-section-header-btn">
                <h2 className="mf-section-title">Transaction history</h2>
                <span className="mf-section-badge">{transactions.length}</span>
              </div>
              <BootstrapIcon
                icon={showTransactions ? 'bi-chevron-up' : 'bi-chevron-down'}
                className="mf-section-chevron"
              />
            </button>
            {showTransactions && <CamsTransactionsTable transactions={transactions} />}
          </section>
        </div>
      )}

      {showAllocationModal && (
        <AllocationModal
          holdings={holdings}
          onClose={() => setShowAllocationModal(false)}
        />
      )}
    </div>
  )
}

export default MutualFundPage
