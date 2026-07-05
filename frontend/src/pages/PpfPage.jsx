import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPpfInvestments, fetchPpfTransactions, uploadPpfStatement } from '../api/ppf'
import PortfolioPageHeader from '../components/layout/PortfolioPageHeader'
import PpfEmptyState from '../components/ppf/PpfEmptyState'
import PpfSummaryCards from '../components/ppf/PpfSummaryCards'
import PpfTransactionsTable from '../components/ppf/PpfTransactionsTable'
import Tooltip from '../components/common/Tooltip'
import { useToast } from '../context/ToastContext'
import { getApiErrorMessage } from '../utils/apiErrors'
import { validatePpfStatementFile } from '../utils/formValidation'
import BootstrapIcon from '../components/icons/BootstrapIcon'

function PpfPage() {
  const { showToast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [investments, setInvestments] = useState([])
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [showTransactions, setShowTransactions] = useState(false)
  const fileInputRef = useRef(null)

  const loadPortfolioData = useCallback(async () => {
    try {
      const [investmentsResult, transactionsResult] = await Promise.all([
        fetchPpfInvestments(),
        fetchPpfTransactions(),
      ])
      setInvestments(investmentsResult.investments ?? [])
      setSummary(investmentsResult.summary ?? null)
      setTransactions(transactionsResult.transactions ?? [])
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to load PPF data.'))
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

    const validationMessage = validatePpfStatementFile(file)
    if (validationMessage) {
      showToast(validationMessage)
      return
    }

    setIsUploading(true)

    try {
      const result = await uploadPpfStatement(file)
      await loadPortfolioData()
      showToast(result.detail, { type: 'success' })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to upload PPF statement.'))
    } finally {
      setIsUploading(false)
    }
  }

  const hasInvestments = investments.length > 0

  return (
    <div className="mf-page ppf-page mf-page-layout">
      <PortfolioPageHeader
        title="Public Provident Fund"
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,application/vnd.ms-excel"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            {hasInvestments && (
              <Tooltip label={isUploading ? 'Uploading PPF statement…' : 'Upload PPF statement'}>
                <button
                  type="button"
                  className="shell-page-icon-btn"
                  onClick={openFilePicker}
                  disabled={isUploading}
                  aria-label={isUploading ? 'Uploading PPF statement' : 'Upload PPF statement'}
                >
                  <BootstrapIcon
                    icon={isUploading ? 'bi-arrow-repeat' : 'bi-upload'}
                    className={isUploading ? 'animate-spin' : undefined}
                  />
                </button>
              </Tooltip>
            )}
          </>
        }
      />

      {(isLoading || hasInvestments) && (
        <div className="mf-page-summary" aria-busy={isLoading}>
          {isLoading ? (
            <div className="mf-summary-grid mf-loading-grid">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="mf-stat-card mf-stat-skeleton" />
              ))}
            </div>
          ) : (
            <PpfSummaryCards summary={summary} investments={investments} />
          )}
        </div>
      )}

      {!isLoading && !hasInvestments && (
        <PpfEmptyState onUpload={openFilePicker} isUploading={isUploading} />
      )}

      {!isLoading && hasInvestments && transactions.length > 0 && (
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
            {showTransactions && <PpfTransactionsTable transactions={transactions} />}
          </section>
        </div>
      )}
    </div>
  )
}

export default PpfPage
