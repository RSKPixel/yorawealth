import BootstrapIcon from '../icons/BootstrapIcon'

function SortableTableHead({ label, sortKey, sort, onSort, className = '' }) {
  const isActive = sort.key === sortKey

  return (
    <th
      className={className}
      aria-sort={
        isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      <button
        type="button"
        className={`mf-table-sort-btn${
          isActive ? ' mf-table-sort-btn-active' : ''
        }${className.includes('mf-table-cell-right') ? ' mf-table-sort-btn-right' : ''}`}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <BootstrapIcon
          icon={
            isActive
              ? sort.direction === 'asc'
                ? 'bi-caret-up-fill'
                : 'bi-caret-down-fill'
              : 'bi-arrow-down-up'
          }
          className="mf-table-sort-icon"
          aria-hidden="true"
        />
      </button>
    </th>
  )
}

export default SortableTableHead
