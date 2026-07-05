import { useEffect, useState } from 'react'

import Modal from '../common/Modal'
import BootstrapIcon from '../icons/BootstrapIcon'
import { FormField, FormInput } from '../form'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  buildManualTradePayload,
  MANUAL_TRADE_TYPES,
  manualTradeToForm,
  validateManualTradeForm,
} from '../../utils/stockTradeValidation'
import { RATE_OPTIONAL_TRADE_TYPES } from './tradeTypes'
import { STOCK_BROKERS, ZERODHA_BROKER } from './stockBrokers'

const EMPTY_FORM = {
  tradeDate: '',
  symbol: '',
  quantity: '',
  rate: '',
  tradeType: 'BUY',
  broker: ZERODHA_BROKER,
}

function ManualTradeModal({ trade, onClose, onSubmit, isSubmitting }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isEdit = Boolean(trade)
  const [form, setFormField] = useState(() =>
    trade ? manualTradeToForm(trade) : EMPTY_FORM,
  )

  useEffect(() => {
    setFormField(trade ? manualTradeToForm(trade) : EMPTY_FORM)
  }, [trade])

  const clientPan = user?.client_pan ?? ''
  const rateOptional = RATE_OPTIONAL_TRADE_TYPES.has(form.tradeType)

  const updateField = (field) => (event) => {
    const value = event.target.value
    setFormField((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async () => {
    const validationMessage = validateManualTradeForm(form)
    if (validationMessage) {
      showToast(validationMessage, { type: 'error' })
      return
    }

    if (!clientPan) {
      showToast('Client PAN is required to store stock transactions.', { type: 'error' })
      return
    }

    await onSubmit(buildManualTradePayload(form))
  }

  const canSubmit =
    Boolean(form.tradeDate) &&
    Boolean(form.symbol.trim()) &&
    Boolean(form.quantity) &&
    Boolean(form.tradeType) &&
    Boolean(form.broker) &&
    (rateOptional || Number(form.rate) > 0) &&
    !isSubmitting

  return (
    <Modal
      title={isEdit ? 'Edit manual trade' : 'Add manual trade'}
      titleIcon={isEdit ? 'bi-pencil' : 'bi-plus-lg'}
      onClose={onClose}
      ariaLabelledBy="manual-trade-modal-title"
      className="stocks-import-modal"
    >
      <div className="stocks-import-modal-body">
        <FormField label="Broker" htmlFor="manual-trade-broker">
          <select
            id="manual-trade-broker"
            className="form-input"
            value={form.broker}
            onChange={updateField('broker')}
            disabled={isSubmitting}
          >
            {STOCK_BROKERS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Client PAN" htmlFor="manual-trade-client-pan">
          <FormInput
            id="manual-trade-client-pan"
            type="text"
            value={clientPan}
            readOnly
            disabled
            className="cursor-not-allowed opacity-70"
          />
        </FormField>

        <FormField label="Trade date" htmlFor="manual-trade-date">
          <FormInput
            id="manual-trade-date"
            type="date"
            value={form.tradeDate}
            onChange={updateField('tradeDate')}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label="Symbol" htmlFor="manual-trade-symbol">
          <FormInput
            id="manual-trade-symbol"
            type="text"
            value={form.symbol}
            onChange={updateField('symbol')}
            placeholder="e.g. RELIANCE"
            disabled={isSubmitting}
            autoCapitalize="characters"
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Quantity" htmlFor="manual-trade-quantity">
            <FormInput
              id="manual-trade-quantity"
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={updateField('quantity')}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Rate" htmlFor="manual-trade-rate">
            <FormInput
              id="manual-trade-rate"
              type="number"
              min="0"
              step="0.01"
              value={form.rate}
              onChange={updateField('rate')}
              disabled={isSubmitting}
              placeholder={rateOptional ? '0 for bonus/split/demerger' : 'Price per share'}
            />
          </FormField>
        </div>

        <FormField label="Trade type" htmlFor="manual-trade-type">
          <select
            id="manual-trade-type"
            className="form-input"
            value={form.tradeType}
            onChange={updateField('tradeType')}
            disabled={isSubmitting}
          >
            {MANUAL_TRADE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        {rateOptional && (
          <p className="stocks-import-modal-hint">
            Bonus and split entries can use rate 0. Split applies to the most recent buy
            lot and keeps invested value unchanged. Demerger uses the rate as cost per share.
          </p>
        )}
      </div>

      <div className="stocks-import-modal-footer">
        <button
          type="button"
          className="shell-page-action-btn"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="shell-page-action-btn stocks-import-submit-btn"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          <BootstrapIcon
            icon={isSubmitting ? 'bi-arrow-repeat' : isEdit ? 'bi-check-lg' : 'bi-plus-lg'}
            className={isSubmitting ? 'animate-spin' : undefined}
          />
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add trade'}
        </button>
      </div>
    </Modal>
  )
}

export default ManualTradeModal
