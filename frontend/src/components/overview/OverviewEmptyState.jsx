import { Link } from 'react-router'
import BootstrapIcon from '../icons/BootstrapIcon'

function OverviewEmptyState() {
  return (
    <div className="mf-empty-state">
      <div className="mf-empty-state-icon" aria-hidden="true">
        <BootstrapIcon icon="bi-grid" />
      </div>
      <h2 className="mf-empty-state-title">Build your portfolio overview</h2>
      <p className="mf-empty-state-text">
        Import mutual fund statements, stock tradebooks, or PPF account statements to
        see consolidated value, returns, and allocation across your holdings.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link to="/mutual-fund" className="shell-page-action-btn mf-empty-state-btn">
          <BootstrapIcon icon="bi-pie-chart" />
          Mutual Fund
        </Link>
        <Link to="/stocks" className="shell-page-action-btn mf-empty-state-btn">
          <BootstrapIcon icon="bi-graph-up" />
          Stocks
        </Link>
        <Link to="/ppf" className="shell-page-action-btn mf-empty-state-btn">
          <BootstrapIcon icon="bi-bank" />
          Public Provident Fund
        </Link>
      </div>
    </div>
  )
}

export default OverviewEmptyState
