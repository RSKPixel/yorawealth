import { useEffect, useRef, useState } from 'react'
import Modal from '../common/Modal'
import BootstrapIcon from '../icons/BootstrapIcon'
import { FormField } from '../form'
import { useToast } from '../../context/ToastContext'
import { IMPORT_STAGES } from '../../api/bankTransactions'
import { fetchGeneralSettings } from '../../api/userSettings'
import { validateBankStatementFile } from '../../utils/formValidation'
import { validateBankStatementCsvFile, BANK_STATEMENT_CSV_COLUMNS } from '../../utils/bankStatementCsv'
import { resolveBankStatementNormalizationPrompt } from '../../constants/bankStatementNormalizationPrompt'
import { getBankAccountTypeLabel } from '../../utils/bankAccountValidation'

const STAGE_LABELS = {
  uploading: 'Uploading file',
  received: 'Validating file',
  parsing: 'Parsing CSV',
  saving: 'Saving transactions',
  complete: 'Import complete',
}

function formatAccountLabel(account) {
  const typeLabel = getBankAccountTypeLabel(account.account_type)
  return `${account.bank_name} · ${account.account_number} (${typeLabel})`
}

function ImportBankStatementModal({
  accounts,
  onClose,
  onImport,
  isImporting,
  importProgress,
}) {
  const { showToast } = useToast()
  const [bankAccountId, setBankAccountId] = useState(
    accounts.length === 1 ? String(accounts[0].id) : '',
  )
  const [selectedFile, setSelectedFile] = useState(null)
  const [accountNumberConfirm, setAccountNumberConfirm] = useState('')
  const [normalizationPrompt, setNormalizationPrompt] = useState('')
  const [isCopyingPrompt, setIsCopyingPrompt] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const loadPrompt = async () => {
      try {
        const settings = await fetchGeneralSettings()
        if (!cancelled) {
          setNormalizationPrompt(
            resolveBankStatementNormalizationPrompt(
              settings.bank_statement_normalization_prompt,
            ),
          )
        }
      } catch {
        if (!cancelled) {
          setNormalizationPrompt(resolveBankStatementNormalizationPrompt())
        }
      }
    }

    loadPrompt()

    return () => {
      cancelled = true
    }
  }, [])

  const selectedAccount = accounts.find(
    (account) => String(account.id) === bankAccountId,
  )

  const resetFileSelection = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAccountChange = (event) => {
    setBankAccountId(event.target.value)
    setAccountNumberConfirm('')
    resetFileSelection()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)

    if (!file) return

    const validationMessage = validateBankStatementFile(file)
    if (validationMessage) {
      showToast(validationMessage, { type: 'error' })
      resetFileSelection()
      return
    }

    const csvValidationMessage = await validateBankStatementCsvFile(file)
    if (csvValidationMessage) {
      showToast(csvValidationMessage, { type: 'error' })
      resetFileSelection()
    }
  }

  const handleCopyPrompt = async () => {
    const prompt = resolveBankStatementNormalizationPrompt(normalizationPrompt)
    setIsCopyingPrompt(true)

    try {
      await navigator.clipboard.writeText(prompt)
      showToast('ChatGPT prompt copied to clipboard.', { type: 'success' })
    } catch {
      showToast('Unable to copy prompt. Please copy it from Settings → General.', {
        type: 'error',
      })
    } finally {
      setIsCopyingPrompt(false)
    }
  }

  const handleImport = async () => {
    if (!bankAccountId) {
      showToast('Please select a bank account.', { type: 'error' })
      return
    }

    if (!selectedFile) {
      showToast('Please select a statement file.', { type: 'error' })
      return
    }

    const validationMessage = validateBankStatementFile(selectedFile)
    if (validationMessage) {
      showToast(validationMessage, { type: 'error' })
      return
    }

    const csvValidationMessage = await validateBankStatementCsvFile(selectedFile)
    if (csvValidationMessage) {
      showToast(csvValidationMessage, { type: 'error' })
      return
    }

    const expectedAccountNumber = selectedAccount?.account_number?.trim() ?? ''
    if (accountNumberConfirm.trim() !== expectedAccountNumber) {
      showToast('Account number does not match. Please re-enter it to confirm.', {
        type: 'error',
      })
      return
    }

    onImport({
      bankAccountId: Number(bankAccountId),
      file: selectedFile,
    })
  }

  const accountNumberMatches =
    selectedAccount &&
    accountNumberConfirm.trim() === selectedAccount.account_number.trim()

  const canImport =
    bankAccountId && selectedFile && accountNumberMatches && !isImporting
  const activeStage = importProgress?.stage
  const activeStageIndex = activeStage ? IMPORT_STAGES.indexOf(activeStage) : -1
  const progressPercent = importProgress?.percent ?? 0

  return (
    <Modal
      title="Import bank statement"
      titleIcon="bi-upload"
      onClose={onClose}
      ariaLabelledBy="import-bank-statement-modal-title"
      className="stocks-import-modal bank-import-modal"
    >
      <div className="stocks-import-modal-body">
        <div className="bank-import-field">
          <FormField label="Bank account" htmlFor="bank-statement-account">
            <select
              id="bank-statement-account"
              className="form-input"
              value={bankAccountId}
              onChange={handleAccountChange}
              disabled={isImporting}
            >
              <option value="">Select account…</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {formatAccountLabel(account)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {selectedAccount && (
          <div className="bank-import-field">
            <FormField
              label="Confirm account number"
              htmlFor="bank-statement-account-confirm"
            >
              <input
                id="bank-statement-account-confirm"
                type="text"
                className="form-input"
                value={accountNumberConfirm}
                onChange={(event) => setAccountNumberConfirm(event.target.value)}
                placeholder={`Re-enter ${selectedAccount.account_number}`}
                disabled={isImporting}
                autoComplete="off"
                inputMode="numeric"
              />
            </FormField>
            <p className="bank-import-field-hint">
              Type the account number again to confirm you are importing into the
              correct account.
            </p>
          </div>
        )}

        <p className="bank-import-format-hint">
          Upload a CSV with columns: {BANK_STATEMENT_CSV_COLUMNS.join(', ')}. Duplicate
          rows are skipped automatically.
        </p>

        <button
          type="button"
          className="bank-import-copy-prompt-btn"
          onClick={handleCopyPrompt}
          disabled={isImporting || isCopyingPrompt}
        >
          <BootstrapIcon
            icon={isCopyingPrompt ? 'bi-arrow-repeat' : 'bi-clipboard'}
            className={isCopyingPrompt ? 'animate-spin' : undefined}
          />
          Click to copy ChatGPT prompt to generate bank statement normalization
        </button>

        <div className="bank-import-field">
          <FormField label="File" htmlFor="bank-statement-file">
            <input
              ref={fileInputRef}
              id="bank-statement-file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={isImporting || !bankAccountId}
            />
            <button
              type="button"
              className="stocks-import-file-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting || !bankAccountId}
            >
              <BootstrapIcon icon="bi-file-earmark-spreadsheet" />
              {selectedFile ? selectedFile.name : 'Choose CSV file'}
            </button>
          </FormField>
        </div>

        {isImporting && importProgress && (
          <div className="bank-import-progress" aria-live="polite">
            <div className="bank-import-progress-track">
              <div
                className="bank-import-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="bank-import-progress-message">{importProgress.message}</p>
            <ol className="bank-import-progress-steps">
              {IMPORT_STAGES.filter((stage) => stage !== 'complete').map((stage) => {
                const stageIndex = IMPORT_STAGES.indexOf(stage)
                const isDone = activeStageIndex > stageIndex
                const isActive = activeStage === stage

                return (
                  <li
                    key={stage}
                    className={`bank-import-progress-step${
                      isDone ? ' bank-import-progress-step-done' : ''
                    }${isActive ? ' bank-import-progress-step-active' : ''}`}
                  >
                    <BootstrapIcon
                      icon={
                        isDone
                          ? 'bi-check-circle-fill'
                          : isActive
                            ? 'bi-arrow-repeat'
                            : 'bi-circle'
                      }
                      className={isActive ? 'animate-spin' : undefined}
                    />
                    <span>{STAGE_LABELS[stage]}</span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>

      <div className="stocks-import-modal-footer">
        <button
          type="button"
          className="shell-page-action-btn"
          onClick={onClose}
          disabled={isImporting}
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

export default ImportBankStatementModal
