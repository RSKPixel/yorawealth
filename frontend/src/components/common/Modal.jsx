import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import BootstrapIcon from '../icons/BootstrapIcon'

function Modal({ title, titleIcon, onClose, children, className = '', ariaLabelledBy }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return createPortal(
    <div className="app-modal-overlay" onClick={onClose}>
      <div
        className={`app-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        {title && (
          <div className="app-modal-header">
            <h1 id={ariaLabelledBy} className="shell-page-card-title flex items-center gap-2">
              {titleIcon && (
                <BootstrapIcon icon={titleIcon} className="app-modal-title-icon" />
              )}
              {title}
            </h1>
            <button
              type="button"
              className="app-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <BootstrapIcon icon="bi-x-lg" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

export default Modal
