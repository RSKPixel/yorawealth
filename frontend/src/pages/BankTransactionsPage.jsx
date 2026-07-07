import { useCallback, useEffect, useState } from 'react'
import { fetchBankAccounts } from '../api/banks'
import { fetchBankTransactions, uploadBankStatementWithProgress } from '../api/bankTransactions'
import BankAccountFilter from '../components/bank/BankAccountFilter'
import BankEmptyState from '../components/bank/BankEmptyState'
import BankTransactionsTable from '../components/bank/BankTransactionsTable'
import ImportBankStatementModal from '../components/bank/ImportBankStatementModal'
import PortfolioPageHeader from '../components/layout/PortfolioPageHeader'
import Tooltip from '../components/common/Tooltip'
import BootstrapIcon from '../components/icons/BootstrapIcon'
import { useToast } from '../context/ToastContext'
import { getApiErrorMessage } from '../utils/apiErrors'

function BankTransactionsPage() {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('all')

  const loadData = useCallback(
    async (accountFilter = selectedAccountId) => {
      try {
        const [accountsResult, transactionsResult] = await Promise.all([
          fetchBankAccounts(),
          fetchBankTransactions(
            accountFilter === 'all' ? {} : { bankAccountId: Number(accountFilter) },
          ),
        ])
        setAccounts(accountsResult.accounts ?? [])
        setTransactions(transactionsResult.transactions ?? [])
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Unable to load bank transactions.'))
      } finally {
        setIsLoading(false)
      }
    },
    [selectedAccountId, showToast],
  )

  useEffect(() => {
    setIsLoading(true)
    loadData()
  }, [loadData])

  const handleImport = async ({ bankAccountId, file }) => {
    setIsImporting(true)
    setImportProgress({
      stage: 'uploading',
      message: 'Starting upload…',
      percent: 5,
    })

    try {
      const result = await uploadBankStatementWithProgress(
        bankAccountId,
        file,
        (progress) => setImportProgress(progress),
      )
      const accountFilter = String(bankAccountId)
      setSelectedAccountId(accountFilter)
      setShowImportModal(false)
      setImportProgress(null)
      await loadData(accountFilter)
      showToast(result.detail, { type: 'success' })
    } catch (error) {
      showToast(error.message || 'Unable to import bank statement.')
    } finally {
      setIsImporting(false)
      setImportProgress(null)
    }
  }

  const hasAccounts = accounts.length > 0
  const hasTransactions = transactions.length > 0

  return (
    <div className="mf-page bank-page mf-page-layout">
      <PortfolioPageHeader
        title="Bank Transactions"
        actions={
          hasAccounts ? (
            <Tooltip label={isImporting ? 'Importing statement…' : 'Import statement'}>
              <button
                type="button"
                className="shell-page-icon-btn"
                onClick={() => setShowImportModal(true)}
                disabled={isImporting}
                aria-label={isImporting ? 'Importing statement' : 'Import statement'}
              >
                <BootstrapIcon
                  icon={isImporting ? 'bi-arrow-repeat' : 'bi-upload'}
                  className={isImporting ? 'animate-spin' : undefined}
                />
              </button>
            </Tooltip>
          ) : null
        }
      />

      {hasAccounts && (
        <BankAccountFilter
          accounts={accounts}
          value={selectedAccountId}
          onChange={setSelectedAccountId}
          disabled={isLoading}
        />
      )}

      {isLoading ? (
        <div className="mf-loading" aria-busy="true">
          <div className="mf-table-skeleton" />
        </div>
      ) : !hasAccounts ? (
        <BankEmptyState variant="no-accounts" />
      ) : !hasTransactions ? (
        <BankEmptyState
          variant="no-transactions"
          onImport={() => setShowImportModal(true)}
          isImporting={isImporting}
        />
      ) : (
        <div className="mf-page-transactions">
          <section className="mf-section">
            <div className="mf-section-header">
              <h2 className="mf-section-title">Transactions</h2>
              <span className="mf-section-badge">{transactions.length}</span>
            </div>
            <BankTransactionsTable transactions={transactions} />
          </section>
        </div>
      )}

      {showImportModal && (
        <ImportBankStatementModal
          accounts={accounts}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          isImporting={isImporting}
          importProgress={importProgress}
        />
      )}
    </div>
  )
}

export default BankTransactionsPage
