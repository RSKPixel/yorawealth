import Modal from '../common/Modal'
import { formatGainAmount, formatHoldingPeriod } from '../../utils/capitalGainsFormat'
import {
  formatNav,
  formatQuantity,
  formatTradeValue,
  formatTransactionDate,
} from '../../utils/mutualFundFormat'
import { formatStockQuantity } from '../../utils/stockFormat'

function gainClassName(value) {
  if (value > 0) return 'mf-gain-positive'
  if (value < 0) return 'mf-gain-negative'
  return 'mf-gain-neutral'
}

function formatRowQuantity(row) {
  if (row.asset_type === 'stock') {
    return formatStockQuantity(row.quantity)
  }

  return formatQuantity(row.quantity)
}

function formatSellRate(row) {
  if (row.asset_type === 'mutual-fund') {
    return formatNav(row.sell_rate)
  }

  return formatTradeValue(row.sell_rate)
}

function formatBuyRate(row) {
  if (row.asset_type === 'mutual-fund') {
    return formatNav(row.buy_rate)
  }

  return formatTradeValue(row.buy_rate)
}

function DetailRow({ label, children, className = '' }) {
  return (
    <div className={`cg-detail-row ${className}`.trim()}>
      <dt className="cg-detail-row-label">{label}</dt>
      <dd className="cg-detail-row-value">{children}</dd>
    </div>
  )
}

function DetailSection({ title, children, className = '' }) {
  return (
    <section className={`cg-detail-section ${className}`.trim()}>
      {title && <h2 className="cg-detail-section-title">{title}</h2>}
      <dl className="cg-detail-rows">{children}</dl>
    </section>
  )
}

function CapitalGainDetailModal({ record, onClose }) {
  if (!record) {
    return null
  }

  const assetLabel = record.asset_type === 'mutual-fund' ? 'Mutual fund' : 'Stock'

  return (
    <Modal
      title={record.label}
      titleIcon="bi-receipt"
      onClose={onClose}
      ariaLabelledBy="capital-gain-detail-title"
      className="cg-detail-modal"
    >
      <div className="cg-detail-body">
        <div className="cg-detail-meta">
          <span>{formatTransactionDate(record.transaction_date)}</span>
          <span className="cg-detail-meta-sep" aria-hidden="true">
            ·
          </span>
          <span>{assetLabel}</span>
          {record.asset_type === 'mutual-fund' && record.meta && (
            <>
              <span className="cg-detail-meta-sep" aria-hidden="true">
                ·
              </span>
              <span className="tabular-nums">{record.meta}</span>
            </>
          )}
          {record.asset_type === 'stock' && record.broker && (
            <>
              <span className="cg-detail-meta-sep" aria-hidden="true">
                ·
              </span>
              <span>{record.broker}</span>
            </>
          )}
        </div>

        <DetailSection title="Trade">
          <DetailRow label="Quantity">{formatRowQuantity(record)}</DetailRow>
          <DetailRow label="Sale price">{formatSellRate(record)}</DetailRow>
          <DetailRow label="Purchase price">{formatBuyRate(record)}</DetailRow>
          <DetailRow label="Sale value">{formatTradeValue(record.trade_value)}</DetailRow>
          <DetailRow label="Purchase value">
            {formatTradeValue(record.purchase_value)}
          </DetailRow>
        </DetailSection>

        <DetailSection title="Capital gains" className="cg-detail-section-gains">
          <DetailRow label="Short Term Capital Gain">
            <span className="cg-detail-gain-values">
              {record.short_term_holding_period_days > 0 && (
                <span className="cg-detail-gain-days">
                  {formatHoldingPeriod(record.short_term_holding_period_days)}
                </span>
              )}
              <span className={gainClassName(record.short_term_gain)}>
                {formatGainAmount(record.short_term_gain)}
              </span>
            </span>
          </DetailRow>
          <DetailRow label="Long Term Capital Gain">
            <span className="cg-detail-gain-values">
              {record.long_term_holding_period_days > 0 && (
                <span className="cg-detail-gain-days">
                  {formatHoldingPeriod(record.long_term_holding_period_days)}
                </span>
              )}
              <span className={gainClassName(record.long_term_gain)}>
                {formatGainAmount(record.long_term_gain)}
              </span>
            </span>
          </DetailRow>
        </DetailSection>

        <DetailSection title="Reason for Sale">
          <p className="cg-detail-note">
            {record.sale_reason?.trim() ? record.sale_reason : '—'}
          </p>
        </DetailSection>
      </div>
    </Modal>
  )
}

export default CapitalGainDetailModal
