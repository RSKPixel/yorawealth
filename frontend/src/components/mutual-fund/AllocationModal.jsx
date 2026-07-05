import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchTargetAllocation,
  saveTargetAllocation,
} from '../../api/mutualFund'
import { useToast } from '../../context/ToastContext'
import { getApiErrorMessage } from '../../utils/apiErrors'
import {
  CATEGORY_ORDER,
  computeCategoryAllocation,
} from '../../utils/categoryAllocation'
import { formatPct } from '../../utils/mutualFundFormat'
import Modal from '../common/Modal'
import BootstrapIcon from '../icons/BootstrapIcon'
import { ALLOCATION_TABS } from './allocationTabs'
import RebalancingPanel from './RebalancingPanel'

function categoryClassName(name) {
  return `mf-allocation-category mf-allocation-category-${name.toLowerCase()}`
}

function targetsToMap(targets) {
  const map = {}
  for (const row of targets ?? []) {
    map[row.asset_class] =
      row.target_pct != null && !Number.isNaN(row.target_pct)
        ? String(row.target_pct)
        : ''
  }
  return map
}

const TAB_DESCRIPTIONS = {
  allocation: 'Set target allocation across Equity, Debt, and Gold.',
  rebalancing: 'Rebalance holdings to match your targets.',
}

function AllocationModal({ holdings, onClose }) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('allocation')
  const allocation = useMemo(() => computeCategoryAllocation(holdings), [holdings])
  const [targets, setTargets] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadTargets = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await fetchTargetAllocation()
      setTargets(targetsToMap(result.targets))
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to load Target Allocation.'))
      setTargets({})
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadTargets()
  }, [loadTargets])

  const categories = CATEGORY_ORDER.map((name) => {
    const row = allocation.categories.find((item) => item.name === name)
    return {
      name,
      currentPct: row?.pct ?? 0,
    }
  })

  const handleTargetChange = (name, value) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) {
      return
    }
    setTargets((prev) => ({ ...prev, [name]: value }))
  }

  const targetTotal = CATEGORY_ORDER.reduce((sum, name) => {
    const parsed = parseFloat(targets[name])
    return sum + (Number.isNaN(parsed) ? 0 : parsed)
  }, 0)

  const allTargetsFilled = CATEGORY_ORDER.every((name) => {
    const raw = targets[name]
    return raw !== '' && raw != null && !Number.isNaN(parseFloat(raw))
  })
  const targetTotalValid = allTargetsFilled && Math.abs(targetTotal - 100) < 0.05

  const handleSave = async () => {
    if (!targetTotalValid) {
      showToast('Target Allocation must add up to 100%.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        targets: CATEGORY_ORDER.map((asset_class) => {
          const raw = targets[asset_class]
          if (raw === '' || raw == null) {
            return { asset_class, target_pct: null }
          }
          return { asset_class, target_pct: parseFloat(raw) }
        }),
      }
      const result = await saveTargetAllocation(payload)
      setTargets(targetsToMap(result.targets))
      showToast('Target Allocation saved.', { type: 'success' })
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Unable to save Target Allocation.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      title="Allocation"
      titleIcon="bi-pie-chart"
      onClose={onClose}
      ariaLabelledBy="allocation-modal-title"
      className="mf-allocation-modal"
    >
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Allocation sections">
          <ul className="settings-nav-list">
            {ALLOCATION_TABS.map((tab) => (
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

        <div className="settings-panel mf-allocation-settings-panel">
          <div className="settings-panel-header mf-allocation-panel-headers">
            <div
              className={`mf-allocation-panel-header${
                activeTab !== 'allocation' ? ' mf-allocation-tab-panel-hidden' : ''
              }`}
              aria-hidden={activeTab !== 'allocation'}
            >
              <h2 className="settings-panel-title">Target Allocation</h2>
              <p className="settings-panel-description">{TAB_DESCRIPTIONS.allocation}</p>
            </div>
            <div
              className={`mf-allocation-panel-header${
                activeTab !== 'rebalancing' ? ' mf-allocation-tab-panel-hidden' : ''
              }`}
              aria-hidden={activeTab !== 'rebalancing'}
            >
              <h2 className="settings-panel-title">Rebalancing</h2>
              <p className="settings-panel-description">{TAB_DESCRIPTIONS.rebalancing}</p>
            </div>
          </div>

          <div className="settings-panel-body mf-allocation-tab-panels">
            <div
              className={`mf-allocation-tab-panel${
                activeTab !== 'allocation' ? ' mf-allocation-tab-panel-hidden' : ''
              }`}
              aria-hidden={activeTab !== 'allocation'}
              inert={activeTab !== 'allocation' ? '' : undefined}
            >
              <div className="mf-allocation-panel">
                <div className="mf-allocation-table-wrap">
                  <table className="mf-allocation-table">
                    <thead>
                      <tr>
                        <th>Asset class</th>
                        <th className="mf-table-cell-right">Current Allocation</th>
                        <th className="mf-table-cell-right">Target Allocation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((row) => (
                        <tr key={row.name}>
                          <td>
                            <span className={categoryClassName(row.name)}>{row.name}</span>
                          </td>
                          <td className="mf-table-cell-right mf-allocation-current">
                            {formatPct(row.currentPct)}
                          </td>
                          <td className="mf-table-cell-right">
                            <div className="mf-allocation-target-cell">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="mf-allocation-target-input"
                                value={targets[row.name] ?? ''}
                                onChange={(event) =>
                                  handleTargetChange(row.name, event.target.value)
                                }
                                placeholder={isLoading ? '…' : '0'}
                                disabled={isSaving}
                                aria-label={`Target Allocation for ${row.name}`}
                              />
                              <span className="mf-allocation-target-suffix">%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="mf-allocation-total-row">
                        <td className="mf-allocation-total-label">Total</td>
                        <td className="mf-table-cell-right">{formatPct(100)}</td>
                        <td
                          className={`mf-table-cell-right mf-allocation-target-total${
                            targetTotalValid ? '' : ' mf-allocation-target-total-warn'
                          }`}
                        >
                          {allTargetsFilled ? formatPct(targetTotal) : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p
                  className={`mf-allocation-hint mf-allocation-hint-warn${
                    targetTotalValid ? ' mf-allocation-tab-panel-hidden' : ''
                  }`}
                  aria-hidden={targetTotalValid}
                >
                  Target Allocation must add up to 100%.
                </p>

                <div className="mf-allocation-modal-actions">
                  <button
                    type="button"
                    className="shell-page-action-btn"
                    onClick={handleSave}
                    disabled={isLoading || isSaving || !allTargetsFilled || !targetTotalValid}
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`mf-allocation-tab-panel${
                activeTab !== 'rebalancing' ? ' mf-allocation-tab-panel-hidden' : ''
              }`}
              aria-hidden={activeTab !== 'rebalancing'}
              inert={activeTab !== 'rebalancing' ? '' : undefined}
            >
              <RebalancingPanel
                allocation={allocation}
                targets={targets}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default AllocationModal
