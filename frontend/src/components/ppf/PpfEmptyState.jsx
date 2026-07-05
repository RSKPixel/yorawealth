import BootstrapIcon from '../icons/BootstrapIcon'

function PpfEmptyState({ onUpload, isUploading }) {
  return (
    <div className="mf-empty-state">
      <div className="mf-empty-state-icon" aria-hidden="true">
        <BootstrapIcon icon="bi-file-earmark-spreadsheet" />
      </div>
      <h2 className="mf-empty-state-title">Import your PPF statement</h2>
      <p className="mf-empty-state-text">
        Upload the bank PPF detailed account statement Excel export to track
        deposits, interest credits, and your current balance.
      </p>
      <button
        type="button"
        className="shell-page-action-btn mf-empty-state-btn"
        onClick={onUpload}
        disabled={isUploading}
      >
        <BootstrapIcon
          icon={isUploading ? 'bi-arrow-repeat' : 'bi-upload'}
          className={isUploading ? 'animate-spin' : undefined}
        />
        {isUploading ? 'Uploading…' : 'Upload PPF statement'}
      </button>
    </div>
  )
}

export default PpfEmptyState
