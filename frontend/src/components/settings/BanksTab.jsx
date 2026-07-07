import { useCallback, useEffect, useState } from 'react'
import {
  createBankAccount,
  deleteBankAccount,
  fetchBankAccounts,
  updateBankAccount,
} from '../../api/banks'
import { useToast } from '../../context/ToastContext'
import { getApiErrorMessage } from '../../utils/apiErrors'
import {
  BANK_ACCOUNT_TYPES,
  bankAccountToForm,
  buildBankAccountPayload,
  EMPTY_BANK_ACCOUNT_FORM,
  getBankAccountTypeLabel,
  validateBankAccountForm,
} from '../../utils/bankAccountValidation'
import {
  FormBody,
  FormButton,
  FormCard,
  FormField,
  FormFooter,
  FormInput,
} from '../form'

function BanksTab() {
  const { showToast } = useToast()
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState(null)
  const [form, setForm] = useState(EMPTY_BANK_ACCOUNT_FORM)

  const loadAccounts = useCallback(async () => {
    try {
      const result = await fetchBankAccounts()
      setAccounts(result.accounts ?? [])
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to load bank accounts.'))
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const resetForm = () => {
    setEditingAccountId(null)
    setForm(EMPTY_BANK_ACCOUNT_FORM)
  }

  const handleSelectAccount = (account) => {
    setEditingAccountId(account.id)
    setForm(bankAccountToForm(account))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateBankAccountForm(form)
    if (validationMessage) {
      showToast(validationMessage, { type: 'error' })
      return
    }

    setIsSaving(true)
    const payload = buildBankAccountPayload(form)

    try {
      const result = editingAccountId
        ? await updateBankAccount(editingAccountId, payload)
        : await createBankAccount(payload)
      await loadAccounts()
      resetForm()
      showToast(result.detail, { type: 'success' })
    } catch (error) {
      showToast(
        getApiErrorMessage(
          error,
          editingAccountId
            ? 'Unable to update bank account.'
            : 'Unable to add bank account.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingAccountId) {
      return
    }

    const account = accounts.find((item) => item.id === editingAccountId)
    const confirmed = window.confirm(
      `Delete ${account?.bank_name ?? 'this'} account ending ${account?.account_number?.slice(-4) ?? ''}?`,
    )
    if (!confirmed) {
      return
    }

    setIsSaving(true)
    try {
      const result = await deleteBankAccount(editingAccountId)
      await loadAccounts()
      resetForm()
      showToast(result.detail, { type: 'success' })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to delete bank account.'))
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  return (
    <div className="settings-banks-tab">
      <FormCard
        onSubmit={handleSubmit}
        className="settings-banks-form w-full shrink-0 border-0 bg-transparent shadow-none"
      >
        <FormBody>
          <div className="profile-fields-grid">
            <FormField label="Bank name" htmlFor="bank-name">
              <FormInput
                id="bank-name"
                type="text"
                value={form.bankName}
                onChange={updateField('bankName')}
                placeholder="e.g. HDFC Bank"
                maxLength={255}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Account type" htmlFor="bank-account-type">
              <select
                id="bank-account-type"
                className="form-input"
                value={form.accountType}
                onChange={updateField('accountType')}
                disabled={isSaving}
              >
                {BANK_ACCOUNT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Account number" htmlFor="bank-account-number">
              <FormInput
                id="bank-account-number"
                type="text"
                value={form.accountNumber}
                onChange={updateField('accountNumber')}
                placeholder="Account number"
                maxLength={64}
                disabled={isSaving}
              />
            </FormField>
          </div>
        </FormBody>

        <FormFooter className="settings-banks-form-footer">
          <FormButton disabled={isSaving}>
            {isSaving ? 'Saving…' : editingAccountId ? 'Save changes' : 'Add account'}
          </FormButton>
          {editingAccountId && (
            <>
              <button
                type="button"
                className="form-button form-button-secondary"
                onClick={resetForm}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="form-button form-button-secondary settings-banks-delete-btn"
                onClick={handleDelete}
                disabled={isSaving}
              >
                Delete
              </button>
            </>
          )}
        </FormFooter>
      </FormCard>

      <div className="mf-table-wrap settings-banks-table-wrap">
        {!isLoading && accounts.length > 0 && (
          <div className="mf-holdings-summary shrink-0">
            <h3 className="text-sm font-medium text-slate-300">Your bank accounts</h3>
            <span className="mf-table-summary">
              {accounts.length} account{accounts.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
        {isLoading ? (
          <div className="settings-banks-list-skeleton" />
        ) : accounts.length === 0 ? (
          <p className="settings-banks-empty">No bank accounts added yet.</p>
        ) : (
          <div className="cg-table-viewport">
            <table className="mf-table settings-banks-table">
              <thead>
                <tr>
                  <th>Bank name</th>
                  <th>Account type</th>
                  <th>Account number</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr
                    key={account.id}
                    className={`cg-gains-row${editingAccountId === account.id ? ' settings-banks-table-row-active' : ''}`}
                    onClick={() => handleSelectAccount(account)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleSelectAccount(account)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Edit ${account.bank_name} account`}
                  >
                    <td className="settings-banks-table-bank">{account.bank_name}</td>
                    <td>
                      {account.account_type_label ??
                        getBankAccountTypeLabel(account.account_type)}
                    </td>
                    <td className="tabular-nums">{account.account_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default BanksTab
