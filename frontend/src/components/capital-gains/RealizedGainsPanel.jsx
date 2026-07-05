import { useCallback, useEffect, useState } from 'react'
import { fetchRealizedGains } from '../../api/capitalGains'
import { useToast } from '../../context/ToastContext'
import { getApiErrorMessage } from '../../utils/apiErrors'
import RealizedSellTransactionsTable from './RealizedSellTransactionsTable'

function RealizedGainsPanel() {
  const { showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState([])

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

  if (isLoading) {
    return <div className="mf-table-skeleton min-h-[12rem] flex-1" />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RealizedSellTransactionsTable transactions={transactions} />
    </div>
  )
}

export default RealizedGainsPanel
