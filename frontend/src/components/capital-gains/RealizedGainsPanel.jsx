import { useCallback, useEffect, useState } from 'react'
import {
  createCapitalGain,
  fetchRealizedGains,
  updateCapitalGain,
} from '../../api/capitalGains'
import { useToast } from '../../context/ToastContext'
import { getApiErrorMessage } from '../../utils/apiErrors'
import BootstrapIcon from '../icons/BootstrapIcon'
import CapitalGainDetailModal from './CapitalGainDetailModal'
import CapitalGainModal from './CapitalGainModal'
import RealizedSellTransactionsTable from './RealizedSellTransactionsTable'

function RealizedGainsPanel() {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [detailRecord, setDetailRecord] = useState(null)
  const [savingSaleReasonRowId, setSavingSaleReasonRowId] = useState(null)

  const loadSellTransactions = useCallback(async () => {
    try {
      const result = await fetchRealizedGains()
      setTransactions(result.transactions ?? [])
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to load sell transactions.'))
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadSellTransactions()
  }, [loadSellTransactions])

  const handleOpenCreate = () => {
    setShowModal(true)
  }

  const handleSaveSaleReason = async (record, saleReason) => {
    setSavingSaleReasonRowId(record.id)
    try {
      const result = await updateCapitalGain(record.id, { sale_reason: saleReason })
      setTransactions((current) =>
        current.map((row) =>
          row.id === record.id
            ? { ...row, sale_reason: result.transaction.sale_reason }
            : row,
        ),
      )
      setDetailRecord((current) =>
        current?.id === record.id
          ? { ...current, sale_reason: result.transaction.sale_reason }
          : current,
      )
      showToast(result.detail, { type: 'success' })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to save reason for sale.'))
    } finally {
      setSavingSaleReasonRowId(null)
    }
  }

  const handleSubmit = async (payload) => {
    setIsSaving(true)
    try {
      const result = await createCapitalGain(payload)
      await loadSellTransactions()
      setShowModal(false)
      showToast(result.detail, { type: 'success' })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to create capital gain record.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="mf-table-skeleton min-h-[12rem] flex-1" />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="cg-realized-actions mb-3 flex shrink-0 justify-end">
        <button
          type="button"
          className="shell-page-action-btn"
          onClick={handleOpenCreate}
          disabled={isSaving}
        >
          <BootstrapIcon icon="bi-plus-lg" className="mr-1.5" />
          Add record
        </button>
      </div>

      <RealizedSellTransactionsTable
        transactions={transactions}
        onRowClick={setDetailRecord}
        onSaveSaleReason={handleSaveSaleReason}
        isMutating={isSaving}
        savingSaleReasonRowId={savingSaleReasonRowId}
      />

      {detailRecord && (
        <CapitalGainDetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
        />
      )}

      {showModal && (
        <CapitalGainModal
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          isSubmitting={isSaving}
        />
      )}
    </div>
  )
}

export default RealizedGainsPanel
