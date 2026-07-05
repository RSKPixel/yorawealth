import BootstrapIcon from '../icons/BootstrapIcon'

function StocksEmptyState({ onImport, isImporting }) {
  return (
    <div className="mf-empty-state">
      <div className="mf-empty-state-icon" aria-hidden="true">
        <BootstrapIcon icon="bi-file-earmark-spreadsheet" />
      </div>
      <h2 className="mf-empty-state-title">Import your broker statement</h2>
      <p className="mf-empty-state-text">
        Upload a tradebook or contract note to build holdings, track returns,
        and reconcile against broker closing balances.
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
        {isImporting ? 'Importing…' : 'Import tradebook'}
      </button>
    </div>
  )
}

export default StocksEmptyState
