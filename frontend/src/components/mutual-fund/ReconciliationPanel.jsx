import BootstrapIcon from '../icons/BootstrapIcon'
import {
  formatNav,
  formatQuantity,
  formatTradeValue,
} from '../../utils/mutualFundFormat'

const STATUS_LABELS = {
  matched: 'Matched',
  missing_cams: 'No CAMS data',
  units_mismatch: 'Units mismatch',
  invested_mismatch: 'Cost mismatch',
  partial: 'Partial',
}

function statusClassName(status) {
  if (status === 'matched') return 'mf-recon-pill-ok'
  if (status === 'missing_cams') return 'mf-recon-pill-warn'
  return 'mf-recon-pill-error'
}

function ReconciliationPanel({ reconciliation }) {
  if (!reconciliation?.summary) {
    return null
  }

  const { summary, rows } = reconciliation
  const mismatches = rows.filter((row) => row.status !== 'matched')
  const isMatched = summary.status === 'matched'

  return (
    <div className={`mf-recon-strip ${isMatched ? 'mf-recon-strip-ok' : 'mf-recon-strip-warn'}`}>
      <div className="mf-recon-strip-main">
        <span className={`mf-recon-pill ${statusClassName(summary.status)}`}>
          <BootstrapIcon icon={isMatched ? 'bi-shield-check' : 'bi-exclamation-triangle'} />
          {isMatched ? 'CAMS reconciled' : 'Reconciliation issue'}
        </span>
        <span className="mf-recon-strip-text">
          {summary.matched_count}/{summary.total_count} holdings match closing balances
          {summary.statement_date && (
            <>
              <span className="mf-recon-strip-sep">·</span>
              NAV date {summary.statement_date}
            </>
          )}
        </span>
      </div>

      {mismatches.length > 0 && (
        <details className="mf-recon-details mf-recon-details-open">
          <summary>
            {mismatches.length} mismatch{mismatches.length === 1 ? '' : 'es'} — view details
          </summary>
          <div className="mf-table-wrap mf-recon-details-table">
            <div className="mf-table-scroll">
              <table className="mf-table mf-table-compact">
                <thead>
                  <tr>
                    <th>Fund</th>
                    <th>Status</th>
                    <th className="mf-table-cell-right">Computed</th>
                    <th className="mf-table-cell-right">CAMS</th>
                    <th className="mf-table-cell-right">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {mismatches.map((row) => (
                    <tr key={`${row.folio}-${row.isin}`}>
                      <td title={row.fund_name}>{row.fund_name}</td>
                      <td>{STATUS_LABELS[row.status] ?? row.status}</td>
                      <td className="mf-table-cell-right">
                        {formatQuantity(row.computed_quantity)}
                      </td>
                      <td className="mf-table-cell-right">
                        {row.cams_closing_units != null
                          ? formatQuantity(row.cams_closing_units)
                          : '—'}
                      </td>
                      <td className="mf-table-cell-right">
                        {row.quantity_diff != null ? formatNav(row.quantity_diff) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      )}

      {isMatched && rows.length > 0 && (
        <details className="mf-recon-details">
          <summary>Cost reconciliation detail</summary>
          <div className="mf-table-wrap mf-recon-details-table">
            <div className="mf-table-scroll">
              <table className="mf-table mf-table-compact">
                <thead>
                  <tr>
                    <th>Fund</th>
                    <th className="mf-table-cell-right">Units</th>
                    <th className="mf-table-cell-right">CAMS cost</th>
                    <th className="mf-table-cell-right">Computed</th>
                    <th className="mf-table-cell-right">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.folio}-${row.isin}-detail`}>
                      <td title={row.fund_name}>{row.fund_name}</td>
                      <td className="mf-table-cell-right">
                        {formatQuantity(row.computed_quantity)}
                      </td>
                      <td className="mf-table-cell-right">
                        {row.cams_total_cost != null
                          ? formatTradeValue(row.cams_total_cost)
                          : '—'}
                      </td>
                      <td className="mf-table-cell-right">
                        {formatTradeValue(row.computed_invested)}
                      </td>
                      <td className="mf-table-cell-right">
                        {row.invested_diff != null
                          ? formatTradeValue(row.invested_diff)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      )}
    </div>
  )
}

export default ReconciliationPanel
