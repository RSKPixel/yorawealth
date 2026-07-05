import { useState } from 'react'
import { CAPITAL_GAINS_TABS } from '../components/capital-gains/capitalGainsTabs'
import RealizedGainsPanel from '../components/capital-gains/RealizedGainsPanel'
import BootstrapIcon from '../components/icons/BootstrapIcon'

function CapitalGainsPage() {
  const [activeTab, setActiveTab] = useState('realized')

  return (
    <div className="shell-page-card cg-page flex max-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden">
      <div className="shell-page-card-header shrink-0">
        <h1 className="shell-page-card-title">Capital Gains</h1>
      </div>
      <div className="shell-page-card-body cg-page-body flex min-h-0 flex-1 flex-col">
        <div
          className="cg-tabs"
          role="tablist"
          aria-label="Capital gains sections"
        >
          {CAPITAL_GAINS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`cg-tab${activeTab === tab.id ? ' cg-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <BootstrapIcon icon={tab.icon} className="cg-tab-icon" />
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className={`cg-tab-panel flex min-h-0 flex-1 flex-col${activeTab !== 'realized' ? ' cg-tab-panel-hidden' : ''}`}
          role="tabpanel"
          aria-hidden={activeTab !== 'realized'}
          inert={activeTab !== 'realized' ? '' : undefined}
        >
          <RealizedGainsPanel />
        </div>

        <div
          className={`cg-tab-panel${activeTab !== 'unrealized' ? ' cg-tab-panel-hidden' : ''}`}
          role="tabpanel"
          aria-hidden={activeTab !== 'unrealized'}
          inert={activeTab !== 'unrealized' ? '' : undefined}
        >
          <p className="text-sm text-zinc-300">Unrealized gains reporting will appear here.</p>
        </div>
      </div>
    </div>
  )
}

export default CapitalGainsPage
