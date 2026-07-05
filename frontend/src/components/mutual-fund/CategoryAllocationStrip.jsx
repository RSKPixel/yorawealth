import { formatPct, formatTradeValue } from '../../utils/mutualFundFormat'
import { CATEGORY_ORDER, computeCategoryAllocation } from '../../utils/categoryAllocation'

function CategoryAllocationStrip({
  holdings,
  totalCurrentValue,
  typeFilter,
  onFilterChange,
}) {
  const allocation = computeCategoryAllocation(holdings)

  if (!allocation.total) {
    return null
  }

  const allCount = holdings.length

  return (
    <div
      className="mf-category-alloc-strip"
      role="group"
      aria-label="Filter holdings by category"
    >
      <button
        type="button"
        className={`mf-category-alloc-item mf-category-alloc-all${
          typeFilter === 'all' ? ' mf-category-alloc-item-active' : ''
        }`}
        onClick={() => onFilterChange('all')}
        aria-pressed={typeFilter === 'all'}
      >
        <div className="mf-category-alloc-head">
          <span className="mf-category-alloc-name">All</span>
          <span className="mf-category-alloc-pct">{formatPct(100)}</span>
        </div>
        <div className="mf-category-alloc-meta">
          <span>{formatTradeValue(totalCurrentValue)}</span>
          <span className="mf-fund-meta-sep">·</span>
          <span>
            {allCount} fund{allCount === 1 ? '' : 's'}
          </span>
        </div>
        <div className="mf-category-alloc-track" aria-hidden="true">
          <div className="mf-category-alloc-fill mf-category-alloc-fill-all" style={{ width: '100%' }} />
        </div>
      </button>

      {CATEGORY_ORDER.map((name) => {
        const category = allocation.categories.find((item) => item.name === name)
        if (!category) return null

        const isActive = typeFilter === name

        return (
          <button
            key={name}
            type="button"
            className={`mf-category-alloc-item mf-category-alloc-${name.toLowerCase()}${
              isActive ? ' mf-category-alloc-item-active' : ''
            }`}
            onClick={() => onFilterChange(name)}
            aria-pressed={isActive}
          >
            <div className="mf-category-alloc-head">
              <span className="mf-category-alloc-name">{name}</span>
              <span className="mf-category-alloc-pct">{formatPct(category.pct)}</span>
            </div>
            <div className="mf-category-alloc-meta">
              <span>{formatTradeValue(category.value)}</span>
              <span className="mf-fund-meta-sep">·</span>
              <span>
                {category.count} fund{category.count === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mf-category-alloc-track" aria-hidden="true">
              <div
                className={`mf-category-alloc-fill mf-category-alloc-fill-${name.toLowerCase()}`}
                style={{ width: `${Math.min(category.pct, 100)}%` }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default CategoryAllocationStrip
