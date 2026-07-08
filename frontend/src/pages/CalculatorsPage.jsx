import { useState } from 'react'
import { CALCULATOR_TABS } from '../components/calculators/calculatorTabs'
import FutureValueCalculator from '../components/calculators/FutureValueCalculator'
import InflationCalculator from '../components/calculators/InflationCalculator'
import PortfolioPageHeader from '../components/layout/PortfolioPageHeader'
import BootstrapIcon from '../components/icons/BootstrapIcon'

function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState('inflation')

  return (
    <div className="mf-page calc-page mf-page-layout">
      <PortfolioPageHeader title="Calculators" />

      <div className="cg-tabs" role="tablist" aria-label="Calculator types">
        {CALCULATOR_TABS.map((tab) => (
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
        className={`mf-page-holdings${activeTab !== 'inflation' ? ' cg-tab-panel-hidden' : ''}`}
        role="tabpanel"
        aria-hidden={activeTab !== 'inflation'}
        inert={activeTab !== 'inflation' ? true : undefined}
      >
        <section className="mf-section">
          <InflationCalculator />
        </section>
      </div>

      <div
        className={`mf-page-holdings${activeTab !== 'future-value' ? ' cg-tab-panel-hidden' : ''}`}
        role="tabpanel"
        aria-hidden={activeTab !== 'future-value'}
        inert={activeTab !== 'future-value' ? true : undefined}
      >
        <section className="mf-section">
          <FutureValueCalculator />
        </section>
      </div>
    </div>
  )
}

export default CalculatorsPage
