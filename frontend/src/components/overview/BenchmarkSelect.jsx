import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import BootstrapIcon from '../icons/BootstrapIcon'

function BenchmarkSelect({
  options = [],
  value,
  onChange,
  reserved = false,
  isLoading = false,
}) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const listId = useId()
  const selected = options.find((option) => option.id === value)
  const label = selected?.label ?? '—'

  useLayoutEffect(() => {
    if (!open || reserved) {
      setMenuStyle(null)
      return undefined
    }

    function updatePosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const viewportPadding = 8
      const maxWidth = 288
      const optionHeight = 28
      const menuPadding = 8
      const maxVisibleItems = 10
      const itemCount = Math.max(options.length + 1, 1) // include "—"
      const contentHeight =
        menuPadding + Math.min(itemCount, maxVisibleItems) * optionHeight
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
      const spaceAbove = rect.top - viewportPadding
      const openUp = spaceBelow < contentHeight && spaceAbove > spaceBelow
      const available = openUp ? spaceAbove : spaceBelow
      const maxHeight = Math.min(contentHeight, Math.max(optionHeight * 3, available))

      let left = rect.left
      const width = Math.max(rect.width, 0)
      if (left + Math.max(width, 120) > window.innerWidth - viewportPadding) {
        left = Math.max(
          viewportPadding,
          window.innerWidth - viewportPadding - Math.max(width, 120),
        )
      }

      setMenuStyle({
        position: 'fixed',
        top: openUp ? undefined : rect.bottom + 4,
        bottom: openUp
          ? window.innerHeight - rect.top + 4
          : undefined,
        left,
        minWidth: width,
        maxWidth,
        maxHeight,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, options.length, reserved])

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      const target = event.target
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (reserved) {
      setOpen(false)
    }
  }, [reserved])

  const menu =
    open && !reserved && menuStyle
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            className="mf-progress-chart-benchmark-menu"
            role="listbox"
            aria-label="Compare with"
            style={menuStyle}
          >
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={!value}
                className={`mf-progress-chart-benchmark-option${!value ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                —
              </button>
            </li>
            {isLoading && options.length === 0 ? (
              <li
                className="mf-progress-chart-benchmark-option mf-progress-chart-benchmark-option--muted"
                role="presentation"
              >
                Loading…
              </li>
            ) : null}
            {options.map((option) => {
              const isSelected = option.id === value

              return (
                <li key={option.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`mf-progress-chart-benchmark-option${
                      isSelected ? ' is-selected' : ''
                    }`}
                    onClick={() => {
                      onChange(option.id)
                      setOpen(false)
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )
      : null

  return (
    <div
      ref={rootRef}
      className={`mf-progress-chart-benchmark${
        reserved ? ' mf-progress-chart-benchmark--reserved' : ''
      }${open ? ' mf-progress-chart-benchmark--open' : ''}${
        isLoading ? ' mf-progress-chart-benchmark--loading' : ''
      }`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="mf-progress-chart-benchmark-trigger"
        aria-label="Compare with"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-hidden={reserved}
        tabIndex={reserved ? -1 : 0}
        disabled={reserved}
        aria-busy={isLoading}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="mf-progress-chart-benchmark-label">{label}</span>
        <BootstrapIcon
          icon="bi-chevron-down"
          className="mf-progress-chart-benchmark-chevron"
        />
      </button>
      {menu}
    </div>
  )
}

export default BenchmarkSelect
