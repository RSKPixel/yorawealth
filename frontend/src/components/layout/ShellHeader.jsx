import { Link, useNavigate } from 'react-router'
import AppBrandName from './AppBrandName'
import BootstrapIcon from '../icons/BootstrapIcon'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { getUserInitials } from '../../utils/userInitials'

function ShellHeader() {
  const { user, logout } = useAuth()
  const { openSettings } = useSettings()
  const navigate = useNavigate()
  const initials = getUserInitials(user?.name)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="shell-header">
      <div className="shell-header-inner">
        <Link to="/overview" className="shell-brand">
          <AppBrandName />
        </Link>

        <div className="shell-user-menu">
          <button
            type="button"
            className="shell-user-trigger"
            title={user?.name}
            aria-label={`${user?.name} account menu`}
            aria-haspopup="menu"
          >
            <span className="shell-user-avatar">
              {user?.profile_pic ? (
                <img
                  src={user.profile_pic}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </span>
          </button>

          <div className="shell-user-dropdown" role="menu">
            <div className="shell-user-dropdown-header">
              <p className="shell-user-dropdown-name">{user?.name}</p>
            </div>
            <button
              type="button"
              onClick={openSettings}
              className="shell-user-dropdown-item"
              role="menuitem"
            >
              <BootstrapIcon icon="bi-gear" className="shell-user-dropdown-icon" />
              Settings
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="shell-user-dropdown-item shell-user-dropdown-item-danger"
              role="menuitem"
            >
              <BootstrapIcon icon="bi-box-arrow-right" className="shell-user-dropdown-icon" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default ShellHeader
