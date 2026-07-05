import { NavLink } from 'react-router'
import Tooltip from '../common/Tooltip'
import BootstrapIcon from '../icons/BootstrapIcon'
import { navSections, navTopItems } from './navigation'

function navLinkClassName({ isActive }, tone = 'teal') {
  const classes = ['shell-nav-link', `shell-nav-link-tone-${tone}`]
  if (isActive) classes.push('shell-nav-link-active')
  return classes.join(' ')
}

function NavItem({ item, collapsed, onNavigate, onIconHoverStart, onIconHoverEnd }) {
  const link = (
    <NavLink
      to={item.path}
      className={(state) => navLinkClassName(state, item.tone)}
      onClick={onNavigate}
      onMouseEnter={collapsed ? onIconHoverStart : undefined}
      onMouseLeave={collapsed ? onIconHoverEnd : undefined}
      aria-label={collapsed ? item.label : undefined}
    >
      <BootstrapIcon icon={item.icon} className="shell-nav-link-icon" />
      <span className="shell-nav-link-label">{item.label}</span>
    </NavLink>
  )

  if (!collapsed) {
    return link
  }

  return (
    <Tooltip label={item.label} placement="right" delayMs={400}>
      {link}
    </Tooltip>
  )
}

function SideNav({
  collapsed = false,
  onNavigate,
  onIconHoverStart,
  onIconHoverEnd,
}) {
  return (
    <nav className="shell-nav" aria-label="Main navigation">
      {navTopItems.length > 0 && (
        <div className="shell-nav-group">
          <ul className="shell-nav-list">
            {navTopItems.map((item) => (
              <li key={item.path}>
                <NavItem
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  onIconHoverStart={onIconHoverStart}
                  onIconHoverEnd={onIconHoverEnd}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {navSections.map((section, sectionIndex) => (
        <div
          key={section.label}
          className={`shell-nav-group${sectionIndex > 0 ? ' shell-nav-group-separated' : ''}`}
        >
          <p className="shell-nav-group-label" aria-hidden={collapsed}>
            {section.label}
          </p>
          <ul className="shell-nav-list">
            {section.items.map((item) => (
              <li key={item.path}>
                <NavItem
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  onIconHoverStart={onIconHoverStart}
                  onIconHoverEnd={onIconHoverEnd}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export default SideNav
