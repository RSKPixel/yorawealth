import { useState } from 'react'
import Modal from '../common/Modal'
import BootstrapIcon from '../icons/BootstrapIcon'
import BanksTab from './BanksTab'
import GeneralTab from './GeneralTab'
import LogTab from './LogTab'
import PasswordTab from './PasswordTab'
import ProfileTab from './ProfileTab'
import { SETTINGS_TAB_DESCRIPTIONS, SETTINGS_TABS } from './settingsTabs'

function SettingsModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('general')
  const activeTabMeta = SETTINGS_TABS.find((tab) => tab.id === activeTab)

  return (
    <Modal
      title="Settings"
      titleIcon="bi-gear"
      onClose={onClose}
      ariaLabelledBy="settings-modal-title"
      className="settings-shell-card"
    >
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          <ul className="settings-nav-list">
            {SETTINGS_TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  className={`settings-nav-item${activeTab === tab.id ? ' settings-nav-item-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <BootstrapIcon icon={tab.icon} className="shell-nav-icon" />
                  <span>{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="settings-panel">
          <div className="settings-panel-header">
            <h2 className="settings-panel-title">{activeTabMeta?.label}</h2>
            <p className="settings-panel-description">
              {SETTINGS_TAB_DESCRIPTIONS[activeTab]}
            </p>
          </div>

          <div
            className={`settings-panel-body${activeTab === 'banks' ? ' settings-panel-body-banks' : ''}`}
          >
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'password' && <PasswordTab />}
            {activeTab === 'banks' && <BanksTab />}
            {activeTab === 'log' && <LogTab />}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default SettingsModal
