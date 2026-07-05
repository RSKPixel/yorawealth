import { useRef, useState } from 'react'
import Modal from '../common/Modal'
import BootstrapIcon from '../icons/BootstrapIcon'
import { FormField } from '../form'
import { useToast } from '../../context/ToastContext'
import { validateTradebookFile } from '../../utils/formValidation'
import { validateTradebookFormat } from '../../utils/zerodhaTradebookCsv'
import {
  getStockBroker,
  resolveTradebookTemplateId,
  STOCK_BROKERS,
  ZERODHA_BROKER,
} from './stockBrokers'

function ImportTradebookModal({ onClose, onImport, isImporting }) {
  const { showToast } = useToast()
  const [broker, setBroker] = useState(ZERODHA_BROKER)
  const [selectedFile, setSelectedFile] = useState(null)
  const [formatError, setFormatError] = useState(null)
  const [isValidating, setIsValidating] = useState(false)
  const fileInputRef = useRef(null)

  const brokerConfig = getStockBroker(broker)

  const resetFileSelection = () => {
    setSelectedFile(null)
    setFormatError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBrokerChange = (event) => {
    setBroker(event.target.value)
    resetFileSelection()
  }

  const reportValidationResult = (message) => {
    setFormatError(message)
    if (message) {
      showToast(message, { type: 'error' })
    }
  }

  const validateSelectedFile = async (file, nextBroker = broker) => {
    const templateId = resolveTradebookTemplateId(nextBroker)
    if (!templateId) {
      const message = 'Unsupported broker.'
      reportValidationResult(message)
      return message
    }

    const basicValidationMessage = validateTradebookFile(file, templateId)
    if (basicValidationMessage) {
      reportValidationResult(basicValidationMessage)
      return basicValidationMessage
    }

    setIsValidating(true)
    try {
      const formatValidationMessage = await validateTradebookFormat(file, templateId)
      reportValidationResult(formatValidationMessage)
      return formatValidationMessage
    } finally {
      setIsValidating(false)
    }
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setFormatError(null)

    if (!file) return

    await validateSelectedFile(file)
  }

  const handleImport = async () => {
    if (!selectedFile) return

    const validationMessage =
      formatError ?? (await validateSelectedFile(selectedFile))
    if (validationMessage) {
      if (!formatError) {
        showToast(validationMessage, { type: 'error' })
      }
      return
    }

    onImport({
      file: selectedFile,
      broker,
    })
  }

  const canImport = selectedFile && !formatError && !isValidating && !isImporting
  const isFilePickerDisabled = !brokerConfig || isImporting || isValidating

  return (
    <Modal
      title="Import tradebook"
      titleIcon="bi-upload"
      onClose={onClose}
      ariaLabelledBy="import-tradebook-modal-title"
      className="stocks-import-modal"
    >
      <div className="stocks-import-modal-body">
        <FormField label="Broker" htmlFor="tradebook-broker">
          <select
            id="tradebook-broker"
            className="form-input"
            value={broker}
            onChange={handleBrokerChange}
            disabled={isImporting || isValidating}
          >
            {STOCK_BROKERS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        {brokerConfig?.hint && (
          <p className="stocks-import-modal-hint">{brokerConfig.hint}</p>
        )}

        <FormField label="File" htmlFor="tradebook-file">
          <input
            ref={fileInputRef}
            id="tradebook-file"
            type="file"
            accept={brokerConfig?.accept ?? ''}
            className="hidden"
            onChange={handleFileChange}
            disabled={isFilePickerDisabled}
          />
          <button
            type="button"
            className="stocks-import-file-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isFilePickerDisabled}
          >
            <BootstrapIcon icon="bi-file-earmark-spreadsheet" />
            {selectedFile ? selectedFile.name : 'Choose CSV file'}
          </button>
          {isValidating && (
            <p className="stocks-import-modal-status">Checking CSV format…</p>
          )}
        </FormField>
      </div>

      <div className="stocks-import-modal-footer">
        <button
          type="button"
          className="shell-page-action-btn"
          onClick={onClose}
          disabled={isImporting || isValidating}
        >
          Cancel
        </button>
        <button
          type="button"
          className="shell-page-action-btn stocks-import-submit-btn"
          onClick={handleImport}
          disabled={!canImport}
        >
          <BootstrapIcon
            icon={isImporting ? 'bi-arrow-repeat' : 'bi-upload'}
            className={isImporting ? 'animate-spin' : undefined}
          />
          {isImporting ? 'Importing…' : 'Import'}
        </button>
      </div>
    </Modal>
  )
}

export default ImportTradebookModal
