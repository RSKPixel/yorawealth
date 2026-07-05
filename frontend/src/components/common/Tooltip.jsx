import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function Tooltip({ label, children, delayMs = 0, placement = 'bottom' }) {
  const triggerRef = useRef(null)
  const showTimeoutRef = useRef(null)
  const tooltipId = useId()
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()
    if (placement === 'right') {
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
      })
      return
    }

    setPosition({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    })
  }, [placement])

  const clearShowTimeout = useCallback(() => {
    if (showTimeoutRef.current != null) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = null
    }
  }, [])

  const showNow = useCallback(() => {
    clearShowTimeout()
    updatePosition()
    setVisible(true)
  }, [clearShowTimeout, updatePosition])

  const scheduleShow = useCallback(() => {
    clearShowTimeout()
    if (delayMs <= 0) {
      showNow()
      return
    }
    showTimeoutRef.current = setTimeout(showNow, delayMs)
  }, [clearShowTimeout, delayMs, showNow])

  const hide = useCallback(() => {
    clearShowTimeout()
    setVisible(false)
  }, [clearShowTimeout])

  useEffect(() => {
    return () => clearShowTimeout()
  }, [clearShowTimeout])

  useEffect(() => {
    if (!visible) {
      return undefined
    }

    updatePosition()

    const handleReposition = () => updatePosition()
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)

    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [visible, updatePosition])

  return (
    <>
      <span
        ref={triggerRef}
        className="app-tooltip-trigger"
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        onFocus={showNow}
        onBlur={hide}
      >
        {children}
      </span>
      {visible &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className={`app-tooltip-bubble${
              placement === 'right' ? ' app-tooltip-bubble-right' : ''
            }`}
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  )
}

export default Tooltip
