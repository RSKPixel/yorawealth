import BootstrapIcon from '../icons/BootstrapIcon'

function MfEmptyState({ onUpload, isUploading }) {
  return (
    <div className="mf-empty-state">
      <div className="mf-empty-state-icon" aria-hidden="true">
        <BootstrapIcon icon="bi-file-earmark-pdf" />
      </div>
      <h2 className="mf-empty-state-title">Import your CAMS statement</h2>
      <p className="mf-empty-state-text">
        Upload a consolidated account statement PDF to build holdings, track returns,
        and reconcile against registrar closing balances.
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
        {isUploading ? 'Uploading…' : 'Upload CAMS PDF'}
      </button>
    </div>
  )
}

export default MfEmptyState
