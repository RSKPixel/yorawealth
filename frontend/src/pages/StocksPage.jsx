import { useCallback, useEffect, useState } from 'react'
import {
  createManualTrade,
  deleteManualTrade,
  fetchStockHoldings,
  fetchStockTransactions,
  updateManualTrade,
  uploadTradebook,
} from '../api/stocks'
import HoldingsTable from '../components/stocks/HoldingsTable'
import ImportTradebookModal from '../components/stocks/ImportTradebookModal'
import ManualTradeModal from '../components/stocks/ManualTradeModal'
import PortfolioPageHeader from '../components/layout/PortfolioPageHeader'
import PortfolioSummaryCards from '../components/stocks/PortfolioSummaryCards'
import StocksEmptyState from '../components/stocks/StocksEmptyState'
import TransactionsTable from '../components/stocks/TransactionsTable'
import Tooltip from '../components/common/Tooltip'
import { useToast } from '../context/ToastContext'
import { getApiErrorMessage } from '../utils/apiErrors'
import BootstrapIcon from '../components/icons/BootstrapIcon'

function StocksPage() {
  const { showToast } = useToast()
  const [isImporting, setIsImporting] = useState(false)
  const [isSavingManualTrade, setIsSavingManualTrade] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showManualTradeModal, setShowManualTradeModal] = useState(false)
  const [editingManualTrade, setEditingManualTrade] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [holdings, setHoldings] = useState([])
  const [holdingsSummary, setHoldingsSummary] = useState(null)
  const [showTransactions, setShowTransactions] = useState(false)

  const loadPortfolioData = useCallback(async () => {
    try {
      const [transactionsResult, holdingsResult] = await Promise.all([
        fetchStockTransactions(),
        fetchStockHoldings(),
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
      showToast(getApiErrorMessage(error, 'Unable to load stock portfolio data.'))
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadPortfolioData()
  }, [loadPortfolioData])

  const handleImport = async ({ file, broker }) => {
    setIsImporting(true)

    try {
      const result = await uploadTradebook(file, broker)
      await loadPortfolioData()
      setShowImportModal(false)
      showToast(result.detail, { type: 'success' })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to import tradebook.'))
    } finally {
      setIsImporting(false)
    }
  }

  const handleManualTrade = async (payload) => {
    setIsSavingManualTrade(true)

    try {
      const result = editingManualTrade
        ? await updateManualTrade(editingManualTrade.trade_id, payload)
        : await createManualTrade(payload)
      await loadPortfolioData()
      setShowManualTradeModal(false)
      setEditingManualTrade(null)
      showToast(result.detail, { type: 'success' })
    } catch (error) {
      showToast(
        getApiErrorMessage(
          error,
          editingManualTrade
            ? 'Unable to update manual trade.'
            : 'Unable to add manual trade.',
        ),
      )
    } finally {
      setIsSavingManualTrade(false)
    }
  }

  const handleEditManualTrade = (trade) => {
    setEditingManualTrade(trade)
    setShowManualTradeModal(true)
  }

  const handleDeleteManualTrade = async (trade) => {
    const confirmed = window.confirm(
      `Delete manual ${trade.trade_type} entry for ${trade.symbol} on ${trade.transaction_date}?`,
    )
    if (!confirmed) {
      return
    }

    setIsSavingManualTrade(true)
    try {
      const result = await deleteManualTrade(trade.trade_id)
      await loadPortfolioData()
      showToast(result.detail, { type: 'success' })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to delete manual trade.'))
    } finally {
      setIsSavingManualTrade(false)
    }
  }

  const openAddManualTradeModal = () => {
    setEditingManualTrade(null)
    setShowManualTradeModal(true)
  }

  const hasHoldings = holdings.length > 0
  const headerBusy = isImporting || isSavingManualTrade

  return (
    <div className="mf-page stocks-page mf-page-layout">
      <PortfolioPageHeader
        title="Stocks"
        actions={
          <>
            <Tooltip label={headerBusy ? 'Saving trade…' : 'Add manual trade'}>
              <button
                type="button"
                className="shell-page-icon-btn"
                onClick={openAddManualTradeModal}
                disabled={headerBusy}
                aria-label={headerBusy ? 'Saving trade' : 'Add manual trade'}
              >
                <BootstrapIcon
                  icon={isSavingManualTrade ? 'bi-arrow-repeat' : 'bi-plus-lg'}
                  className={isSavingManualTrade ? 'animate-spin' : undefined}
                />
              </button>
            </Tooltip>
            <Tooltip label={isImporting ? 'Importing tradebook…' : 'Import tradebook'}>
              <button
                type="button"
                className="shell-page-icon-btn"
                onClick={() => setShowImportModal(true)}
                disabled={headerBusy}
                aria-label={isImporting ? 'Importing tradebook' : 'Import tradebook'}
              >
                <BootstrapIcon
                  icon={isImporting ? 'bi-arrow-repeat' : 'bi-upload'}
                  className={isImporting ? 'animate-spin' : undefined}
                />
              </button>
            </Tooltip>
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
        <StocksEmptyState
          onImport={() => setShowImportModal(true)}
          isImporting={isImporting}
        />
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
                <span className="mf-section-badge">{holdings.length} stocks</span>
              </div>
              <HoldingsTable
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
            {showTransactions && (
              <TransactionsTable
                transactions={transactions}
                onEditManual={handleEditManualTrade}
                onDeleteManual={handleDeleteManualTrade}
                isMutating={isSavingManualTrade}
              />
            )}
          </section>
        </div>
      )}

      {showManualTradeModal && (
        <ManualTradeModal
          trade={editingManualTrade}
          onClose={() => {
            setShowManualTradeModal(false)
            setEditingManualTrade(null)
          }}
          onSubmit={handleManualTrade}
          isSubmitting={isSavingManualTrade}
        />
      )}

      {showImportModal && (
        <ImportTradebookModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          isImporting={isImporting}
        />
      )}
    </div>
  )
}

export default StocksPage
