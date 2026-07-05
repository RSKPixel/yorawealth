import { toNumber } from './overviewAggregate'

export function ppfToSummaryPart(ppfResult) {
  const deposited = toNumber(ppfResult?.summary?.total_deposited)
  const withdrawn = toNumber(ppfResult?.summary?.total_withdrawn)
  const balance = toNumber(ppfResult?.summary?.total_balance)
  const netInvested = deposited - withdrawn

  if (balance <= 0 && (ppfResult?.investments?.length ?? 0) === 0) {
    return null
  }

  return {
    total_invested: netInvested,
    total_current_value: balance,
    total_unrealized_gain: balance - netInvested,
    xirr: ppfResult?.summary?.xirr ?? null,
  }
}

export function workspaceIcon(key) {
  if (key === 'mf') return 'bi-pie-chart'
  if (key === 'stocks') return 'bi-graph-up'
  if (key === 'ppf') return 'bi-bank'
  return 'bi-grid'
}
