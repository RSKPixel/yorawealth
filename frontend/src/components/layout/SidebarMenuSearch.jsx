import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router'
import { INPUT_AUTOCOMPLETE } from '../../utils/form'
import { flattenNavItems, searchNavItems } from '../../utils/navSearch'
import BootstrapIcon from '../icons/BootstrapIcon'
import Tooltip from '../common/Tooltip'

const SidebarMenuSearch = forwardRef(function SidebarMenuSearch(
  {
    collapsed = false,
    onNavigate,
    onExpandRequest,
    onIconHoverStart,
    onIconHoverEnd,
  },
  ref,
) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const wrapRef = useRef(null)
  const pendingFocusRef = useRef(false)

  useImperativeHandle(ref, () => ({
    focus() {
      inputRef.current?.focus()
    },
  }))

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [open, setOpen] = useState(false)

  const navItems = useMemo(() => flattenNavItems(), [])
  const trimmedQuery = query.trim()
  const results = useMemo(
    () => (trimmedQuery ? searchNavItems(navItems, query) : []),
    [navItems, query, trimmedQuery],
  )
  const showResults = open && trimmedQuery.length > 0

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!collapsed && pendingFocusRef.current) {
      pendingFocusRef.current = false
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [collapsed])

  const clearSearch = useCallback(() => {
    setQuery('')
    setActiveIndex(0)
    setOpen(false)
  }, [])

  const selectItem = useCallback(
    (path) => {
      navigate(path)
      clearSearch()
      onNavigate?.()
    },
    [navigate, clearSearch, onNavigate],
  )

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      clearSearch()
      inputRef.current?.blur()
      return
    }

    if (!showResults || results.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = results[activeIndex]
      if (item) {
        selectItem(item.path)
      }
    }
  }

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  if (collapsed) {
    return (
      <Tooltip label="Search modules" placement="right" delayMs={400}>
        <button
          type="button"
          className="shell-sidebar-search-rail-btn"
          onClick={() => {
            pendingFocusRef.current = true
            onExpandRequest?.()
          }}
          onMouseEnter={onIconHoverStart}
          onMouseLeave={onIconHoverEnd}
          aria-label="Search modules"
        >
          <BootstrapIcon icon="bi-search" className="text-[15px]" />
        </button>
      </Tooltip>
    )
  }

  return (
    <div className="shell-sidebar-search-wrap" ref={wrapRef}>
      <span className="shell-sidebar-search-icon" aria-hidden="true">
        <BootstrapIcon icon="bi-search" />
      </span>
      <input
        ref={inputRef}
        type="search"
        className="shell-sidebar-search-input"
        value={query}
        placeholder="Search…"
        aria-label="Search modules"
        aria-expanded={showResults}
        aria-controls="shell-sidebar-search-results"
        aria-autocomplete="list"
        autoComplete={INPUT_AUTOCOMPLETE}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {query && (
        <button
          type="button"
          className="shell-sidebar-search-clear"
          onClick={clearSearch}
          aria-label="Clear search"
        >
          <BootstrapIcon icon="bi-x-lg" className="text-[10px]" />
        </button>
      )}

      {showResults && (
        <ul
          id="shell-sidebar-search-results"
          className="shell-sidebar-search-results"
          role="listbox"
        >
          {results.length === 0 ? (
            <li className="shell-sidebar-search-empty">No modules match.</li>
          ) : (
            results.map((item, index) => {
              const isActive = index === activeIndex

              return (
                <li key={item.path} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={`shell-sidebar-search-result${
                      isActive ? ' shell-sidebar-search-result-active' : ''
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectItem(item.path)}
                  >
                    <span className="shell-sidebar-search-result-icon" aria-hidden="true">
                      <BootstrapIcon icon={item.icon} />
                    </span>
                    <span className="shell-sidebar-search-result-copy">
                      <span className="shell-sidebar-search-result-label">
                        {item.label}
                      </span>
                      <span className="shell-sidebar-search-result-section">
                        {item.section}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
})

export default SidebarMenuSearch
