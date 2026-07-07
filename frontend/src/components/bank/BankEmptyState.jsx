import BootstrapIcon from '../icons/BootstrapIcon'

function BankEmptyState({ variant, onImport, isImporting }) {
  if (variant === 'no-accounts') {
    return (
      <div className="mf-empty-state">
        <div className="mf-empty-state-icon" aria-hidden="true">
          <BootstrapIcon icon="bi-bank2" />
        </div>
        <h2 className="mf-empty-state-title">No bank accounts yet</h2>
        <p className="mf-empty-state-text">
          Add your bank accounts in Settings → Banks, then return here to import
          statements.
        </p>
      </div>
    )
  }

  return (
    <div className="mf-empty-state">
      <div className="mf-empty-state-icon" aria-hidden="true">
        <BootstrapIcon icon="bi-file-earmark-spreadsheet" />
      </div>
      <h2 className="mf-empty-state-title">No transactions imported</h2>
      <p className="mf-empty-state-text">
        Upload a CSV with columns date, desc, ref, debit, credit for the selected
        account. Duplicate rows are skipped automatically.
      </p>
      <button
        type="button"
        className="shell-page-action-btn mf-empty-state-btn"
        onClick={onImport}
        disabled={isImporting}
      >
        <BootstrapIcon
          icon={isImporting ? 'bi-arrow-repeat' : 'bi-upload'}
          className={isImporting ? 'animate-spin' : undefined}
        />
        {isImporting ? 'Importing…' : 'Import statement'}
      </button>
    </div>
  )
}

export default BankEmptyState
