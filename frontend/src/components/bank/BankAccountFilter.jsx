import { getBankAccountTypeLabel } from '../../utils/bankAccountValidation'

function BankAccountFilter({ accounts, value, onChange, disabled }) {
  return (
    <div className="bank-account-filter">
      <label className="bank-account-filter-label" htmlFor="bank-account-filter">
        Account
      </label>
      <select
        id="bank-account-filter"
        className="bank-account-filter-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="all">All accounts</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.bank_name} · {account.account_number} (
            {getBankAccountTypeLabel(account.account_type)})
          </option>
        ))}
      </select>
    </div>
  )
}

export default BankAccountFilter
