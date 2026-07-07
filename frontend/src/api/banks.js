import api from '../services/api'

export async function fetchBankAccounts() {
  const response = await api.get('/banks/accounts')
  return { accounts: response.data.accounts ?? [] }
}

export async function createBankAccount(payload) {
  const response = await api.post('/banks/accounts', payload)
  return {
    account: response.data.account,
    detail: response.data.detail,
  }
}

export async function updateBankAccount(accountId, payload) {
  const response = await api.put(`/banks/accounts/${accountId}`, payload)
  return {
    account: response.data.account,
    detail: response.data.detail,
  }
}

export async function deleteBankAccount(accountId) {
  const response = await api.delete(`/banks/accounts/${accountId}`)
  return { detail: response.data.detail }
}
