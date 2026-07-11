import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const VIEWPORT_PADDING = 8

function Tooltip({
  label,
  children,
  delayMs = 0,
  placement = 'bottom',
  variant = 'default',
}) {
  const triggerRef = useRef(null)
  const bubbleRef = useRef(null)
  const showTimeoutRef = useRef(null)
  const tooltipId = useId()
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, tipOffset: 0 })

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()
    const gap = variant === 'card' ? 10 : 8
    let top
    let left

    if (placement === 'right') {
      top = rect.top + rect.height / 2
      left = rect.right + gap
    } else if (placement === 'top') {
      top = rect.top - gap
      left = rect.left + rect.width / 2
    } else {
      top = rect.bottom + gap
      left = rect.left + rect.width / 2
    }

    const bubble = bubbleRef.current
    let tipOffset = 0

    if (bubble && placement !== 'right') {
      const { width } = bubble.getBoundingClientRect()
      const half = width / 2
      const minCenter = VIEWPORT_PADDING + half
      const maxCenter = window.innerWidth - VIEWPORT_PADDING - half
      const clampedLeft = Math.min(Math.max(left, minCenter), maxCenter)
      const rawTipOffset = left - clampedLeft
      const maxTip = Math.max(half - 14, 0)
      tipOffset = Math.min(Math.max(rawTipOffset, -maxTip), maxTip)
      left = clampedLeft
    } else if (bubble && placement === 'right') {
      const { width, height } = bubble.getBoundingClientRect()
      const maxLeft = window.innerWidth - VIEWPORT_PADDING - width
      left = Math.min(left, Math.max(VIEWPORT_PADDING, maxLeft))
      const halfH = height / 2
      top = Math.min(
        Math.max(top, VIEWPORT_PADDING + halfH),
        window.innerHeight - VIEWPORT_PADDING - halfH,
      )
    }

    setPosition({ top, left, tipOffset })
  }, [placement, variant])

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

  useLayoutEffect(() => {
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
  }, [visible, updatePosition, label])

  const bubbleClass = [
    'app-tooltip-bubble',
    variant === 'card' ? 'app-tooltip-bubble-card' : '',
    placement === 'right' ? 'app-tooltip-bubble-right' : '',
    placement === 'top' ? 'app-tooltip-bubble-top' : '',
  ]
    .filter(Boolean)
    .join(' ')

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
            ref={bubbleRef}
            id={tooltipId}
            role="tooltip"
            className={bubbleClass}
            style={{
              top: position.top,
              left: position.left,
              '--tooltip-tip-offset': `${position.tipOffset}px`,
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
