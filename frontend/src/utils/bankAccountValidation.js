export const BANK_ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings Account' },
  { value: 'current', label: 'Current Account' },
  { value: 'loan', label: 'Loan Account' },
  { value: 'overdraft', label: 'Overdraft/Cash Credit A/c' },
]

export const EMPTY_BANK_ACCOUNT_FORM = {
  bankName: '',
  accountType: 'savings',
  accountNumber: '',
}

export function bankAccountToForm(account) {
  if (!account) {
    return EMPTY_BANK_ACCOUNT_FORM
  }

  return {
    bankName: account.bank_name ?? '',
    accountType: account.account_type ?? 'savings',
    accountNumber: account.account_number ?? '',
  }
}

export function buildBankAccountPayload(form) {
  return {
    bank_name: form.bankName.trim(),
    account_type: form.accountType,
    account_number: form.accountNumber.trim(),
  }
}

export function validateBankAccountForm(form) {
  if (!form.bankName.trim()) {
    return 'Bank name is required.'
  }
  if (!form.accountType) {
    return 'Account type is required.'
  }
  if (!form.accountNumber.trim()) {
    return 'Account number is required.'
  }
  if (form.accountNumber.trim().length > 64) {
    return 'Account number must be 64 characters or fewer.'
  }
  if (form.bankName.trim().length > 255) {
    return 'Bank name must be 255 characters or fewer.'
  }

  return null
}

export function getBankAccountTypeLabel(accountType) {
  return BANK_ACCOUNT_TYPES.find((option) => option.value === accountType)?.label ?? accountType
}
