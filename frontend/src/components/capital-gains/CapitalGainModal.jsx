import { useEffect, useState } from 'react'

import Modal from '../common/Modal'
import BootstrapIcon from '../icons/BootstrapIcon'
import { FormField, FormInput } from '../form'
import { useToast } from '../../context/ToastContext'
import {
  buildCapitalGainPayload,
  capitalGainToForm,
  EMPTY_FORM,
  SALE_REASON_MAX_LENGTH,
  validateCapitalGainForm,
} from '../../utils/capitalGainValidation'
import {
  formatGainAmount,
  formatHoldingPeriod,
} from '../../utils/capitalGainsFormat'
import {
  formatNav,
  formatQuantity,
  formatTradeValue,
  formatTransactionDate,
} from '../../utils/mutualFundFormat'
import { formatStockQuantity } from '../../utils/stockFormat'

function ReadOnlyValue({ children }) {
  return (
    <div className="form-input cursor-not-allowed opacity-80" aria-readonly="true">
      {children}
    </div>
  )
}

function CapitalGainModal({ record, onClose, onSubmit, isSubmitting }) {
  const { showToast } = useToast()
  const isEdit = Boolean(record)
  const isManual = !isEdit || record.is_manual
  const [form, setFormField] = useState(() =>
    record ? capitalGainToForm(record) : EMPTY_FORM,
  )

  useEffect(() => {
    setFormField(record ? capitalGainToForm(record) : EMPTY_FORM)
  }, [record])

  const updateField = (field) => (event) => {
    const value = event.target.value
    setFormField((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async () => {
    const validationMessage = validateCapitalGainForm(form, { isManual })
    if (validationMessage) {
      showToast(validationMessage, { type: 'error' })
      return
    }

    await onSubmit(buildCapitalGainPayload(form, { isManualEdit: isManual }))
  }

  const canSubmit =
    (isManual
      ? Boolean(form.transactionDate) &&
        Boolean(form.label.trim()) &&
        Boolean(form.quantity) &&
        Boolean(form.tradeValue) &&
        Boolean(form.purchaseValue)
      : true) &&
    form.saleReason.length <= SALE_REASON_MAX_LENGTH &&
    !isSubmitting

  const title = isEdit
    ? isManual
      ? 'Edit capital gain'
      : 'Edit capital gain'
    : 'Add capital gain'

  return (
    <Modal
      title={title}
      titleIcon={isEdit ? 'bi-pencil' : 'bi-plus-lg'}
      onClose={onClose}
      ariaLabelledBy="capital-gain-modal-title"
      className="stocks-import-modal"
    >
      <div className="stocks-import-modal-body">
        {isEdit && !isManual ? (
          <>
            <FormField label="Date">
              <ReadOnlyValue>{formatTransactionDate(record.transaction_date)}</ReadOnlyValue>
            </FormField>
            <FormField label="Symbol">
              <ReadOnlyValue>{record.label}</ReadOnlyValue>
            </FormField>
            {record.asset_type === 'stock' && (
              <FormField label="Broker">
                <ReadOnlyValue>{record.broker ?? '—'}</ReadOnlyValue>
              </FormField>
            )}
            <FormField label="Qty">
              <ReadOnlyValue>
                {record.asset_type === 'stock'
                  ? formatStockQuantity(record.quantity)
                  : formatQuantity(record.quantity)}
              </ReadOnlyValue>
            </FormField>
            <FormField label="Sale value">
              <ReadOnlyValue>
                {formatTradeValue(record.trade_value)}
                {' '}
                (
                {record.asset_type === 'mutual-fund'
                  ? formatNav(record.sell_rate)
                  : formatTradeValue(record.sell_rate)}
                )
              </ReadOnlyValue>
            </FormField>
            <FormField label="Purchase value">
              <ReadOnlyValue>
                {formatTradeValue(record.purchase_value)}
                {' '}
                (
                {record.asset_type === 'mutual-fund'
                  ? formatNav(record.buy_rate)
                  : formatTradeValue(record.buy_rate)}
                )
              </ReadOnlyValue>
            </FormField>
            <FormField label="STCG">
              <ReadOnlyValue>
                {formatGainAmount(record.short_term_gain)}
                {record.short_term_holding_period_days > 0 &&
                  ` (${formatHoldingPeriod(record.short_term_holding_period_days)})`}
              </ReadOnlyValue>
            </FormField>
            <FormField label="LTCG">
              <ReadOnlyValue>
                {formatGainAmount(record.long_term_gain)}
                {record.long_term_holding_period_days > 0 &&
                  ` (${formatHoldingPeriod(record.long_term_holding_period_days)})`}
              </ReadOnlyValue>
            </FormField>
          </>
        ) : (
          <>
            <FormField label="Asset type" htmlFor="capital-gain-asset-type">
              <select
                id="capital-gain-asset-type"
                className="form-input"
                value={form.assetType}
                onChange={updateField('assetType')}
                disabled={isSubmitting}
              >
                <option value="stock">Stock</option>
                <option value="mutual-fund">Mutual fund</option>
              </select>
            </FormField>

            <FormField label="Transaction date" htmlFor="capital-gain-date">
              <FormInput
                id="capital-gain-date"
                type="date"
                value={form.transactionDate}
                onChange={updateField('transactionDate')}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField
              label={form.assetType === 'mutual-fund' ? 'Fund name' : 'Symbol'}
              htmlFor="capital-gain-label"
            >
              <FormInput
                id="capital-gain-label"
                type="text"
                value={form.label}
                onChange={updateField('label')}
                disabled={isSubmitting}
              />
            </FormField>

            {form.assetType === 'mutual-fund' ? (
              <FormField label="ISIN" htmlFor="capital-gain-meta">
                <FormInput
                  id="capital-gain-meta"
                  type="text"
                  value={form.meta}
                  onChange={updateField('meta')}
                  disabled={isSubmitting}
                />
              </FormField>
            ) : (
              <FormField label="Broker" htmlFor="capital-gain-broker">
                <FormInput
                  id="capital-gain-broker"
                  type="text"
                  value={form.broker}
                  onChange={updateField('broker')}
                  disabled={isSubmitting}
                />
              </FormField>
            )}

            <FormField label="Quantity" htmlFor="capital-gain-quantity">
              <FormInput
                id="capital-gain-quantity"
                type="number"
                min="0"
                step={form.assetType === 'stock' ? '1' : '0.001'}
                value={form.quantity}
                onChange={updateField('quantity')}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="Sale value" htmlFor="capital-gain-trade-value">
              <FormInput
                id="capital-gain-trade-value"
                type="number"
                min="0"
                step="0.01"
                value={form.tradeValue}
                onChange={updateField('tradeValue')}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="Sell rate" htmlFor="capital-gain-sell-rate">
              <FormInput
                id="capital-gain-sell-rate"
                type="number"
                min="0"
                step="0.0001"
                value={form.sellRate}
                onChange={updateField('sellRate')}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="Purchase value" htmlFor="capital-gain-purchase-value">
              <FormInput
                id="capital-gain-purchase-value"
                type="number"
                min="0"
                step="0.01"
                value={form.purchaseValue}
                onChange={updateField('purchaseValue')}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="Buy rate" htmlFor="capital-gain-buy-rate">
              <FormInput
                id="capital-gain-buy-rate"
                type="number"
                min="0"
                step="0.0001"
                value={form.buyRate}
                onChange={updateField('buyRate')}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="STCG" htmlFor="capital-gain-stcg">
              <FormInput
                id="capital-gain-stcg"
                type="number"
                step="0.01"
                value={form.shortTermGain}
                onChange={updateField('shortTermGain')}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="STCG holding days" htmlFor="capital-gain-stcg-days">
              <FormInput
                id="capital-gain-stcg-days"
                type="number"
                min="0"
                step="1"
                value={form.shortTermHoldingPeriodDays}
                onChange={updateField('shortTermHoldingPeriodDays')}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="LTCG" htmlFor="capital-gain-ltcg">
              <FormInput
                id="capital-gain-ltcg"
                type="number"
                step="0.01"
                value={form.longTermGain}
                onChange={updateField('longTermGain')}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="LTCG holding days" htmlFor="capital-gain-ltcg-days">
              <FormInput
                id="capital-gain-ltcg-days"
                type="number"
                min="0"
                step="1"
                value={form.longTermHoldingPeriodDays}
                onChange={updateField('longTermHoldingPeriodDays')}
                disabled={isSubmitting}
              />
            </FormField>
          </>
        )}

        {!isEdit && (
          <FormField label="Reason for Sale" htmlFor="capital-gain-sale-reason">
            <FormInput
              id="capital-gain-sale-reason"
              type="text"
              maxLength={SALE_REASON_MAX_LENGTH}
              value={form.saleReason}
              onChange={updateField('saleReason')}
              disabled={isSubmitting}
              placeholder="Optional"
            />
          </FormField>
        )}

        <div className="stocks-import-modal-footer">
          <button
            type="button"
            className="form-button form-button-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="form-button form-button-primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add record'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CapitalGainModal
