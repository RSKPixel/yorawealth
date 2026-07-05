import { useEffect, useRef, useState } from 'react'
import {
  readSidebarPinned,
  SIDEBAR_HOVER_EXPAND_DELAY_MS,
  writeSidebarPinned,
} from '../../config/sidebarPin'
import BootstrapIcon from '../icons/BootstrapIcon'
import Tooltip from '../common/Tooltip'
import SidebarMenuSearch from './SidebarMenuSearch'
import SideNav from './SideNav'

function ShellSidebar() {
  const [sidebarPinned, setSidebarPinned] = useState(readSidebarPinned)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const expandTimeoutRef = useRef(null)

  const isExpanded = sidebarPinned || sidebarHovered

  const clearExpandTimeout = () => {
    if (expandTimeoutRef.current != null) {
      clearTimeout(expandTimeoutRef.current)
      expandTimeoutRef.current = null
    }
  }

  useEffect(() => () => clearExpandTimeout(), [])

  const closeSidebar = () => {
    if (!sidebarPinned) {
      clearExpandTimeout()
      setSidebarHovered(false)
    }
  }

  const toggleSidebarPin = () => {
    setSidebarPinned((pinned) => {
      const next = !pinned
      writeSidebarPinned(next)
      return next
    })
  }

  const handleExpandRequest = () => {
    clearExpandTimeout()
    setSidebarHovered(true)
  }

  const handleIconHoverStart = () => {
    if (sidebarPinned || sidebarHovered) {
      return
    }

    clearExpandTimeout()
    expandTimeoutRef.current = setTimeout(() => {
      setSidebarHovered(true)
    }, SIDEBAR_HOVER_EXPAND_DELAY_MS)
  }

  const handleIconHoverEnd = () => {
    if (sidebarPinned || sidebarHovered) {
      return
    }

    clearExpandTimeout()
  }

  const handleZoneMouseLeave = () => {
    clearExpandTimeout()
    if (!sidebarPinned) {
      setSidebarHovered(false)
    }
  }

  const pinButton = (
    <button
      type="button"
      className={`shell-sidebar-pin${
        sidebarPinned ? ' shell-sidebar-pin-active' : ''
      }`}
      onClick={toggleSidebarPin}
      onMouseEnter={!isExpanded ? handleIconHoverStart : undefined}
      onMouseLeave={!isExpanded ? handleIconHoverEnd : undefined}
      aria-label={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
      aria-pressed={sidebarPinned}
    >
      <BootstrapIcon
        icon={sidebarPinned ? 'bi-pin-fill' : 'bi-pin'}
        className="text-sm"
      />
    </button>
  )

  return (
    <div
      className={`shell-sidebar-zone${
        sidebarPinned ? ' shell-sidebar-zone-pinned' : ' shell-sidebar-zone-unpinned'
      }${isExpanded ? ' shell-sidebar-zone-expanded' : ' shell-sidebar-zone-collapsed'}`}
      onMouseLeave={handleZoneMouseLeave}
    >
      <div
        className={`shell-sidebar-wrap${
          sidebarPinned ? ' shell-sidebar-wrap-pinned' : ' shell-sidebar-wrap-rail'
        }`}
      >
        <aside
          id="shell-sidebar"
          className={`shell-sidebar${
            isExpanded ? ' shell-sidebar-expanded' : ' shell-sidebar-collapsed'
          }`}
        >
          <div className="shell-sidebar-toolbar">
            <SidebarMenuSearch
              collapsed={!isExpanded}
              onNavigate={closeSidebar}
              onExpandRequest={handleExpandRequest}
              onIconHoverStart={handleIconHoverStart}
              onIconHoverEnd={handleIconHoverEnd}
            />
          </div>

          <SideNav
            collapsed={!isExpanded}
            onNavigate={closeSidebar}
            onIconHoverStart={handleIconHoverStart}
            onIconHoverEnd={handleIconHoverEnd}
          />

          <div className="shell-sidebar-footer">
            {!isExpanded ? (
              <Tooltip
                label={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                placement="right"
                delayMs={400}
              >
                {pinButton}
              </Tooltip>
            ) : (
              pinButton
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ShellSidebar
