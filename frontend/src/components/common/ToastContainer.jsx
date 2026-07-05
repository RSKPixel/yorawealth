import BootstrapIcon from '../icons/BootstrapIcon'

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}${toast.exiting ? ' toast-exiting' : ''}`}
          role="alert"
        >
          <p className="toast-message">{toast.message}</p>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss message"
          >
            <BootstrapIcon icon="bi-x-lg" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
