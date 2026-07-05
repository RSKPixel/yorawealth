export function toggleSortKey(current, nextKey) {
  if (current.key !== nextKey) {
    return { key: nextKey, direction: 'asc' }
  }
  return {
    key: nextKey,
    direction: current.direction === 'asc' ? 'desc' : 'asc',
  }
}

export function compareSortValues(a, b, direction) {
  const aNull = a == null || Number.isNaN(a)
  const bNull = b == null || Number.isNaN(b)

  if (aNull && bNull) {
    return 0
  }
  if (aNull) {
    return 1
  }
  if (bNull) {
    return -1
  }

  let result = 0
  if (typeof a === 'string' && typeof b === 'string') {
    result = a.localeCompare(b, undefined, { sensitivity: 'base' })
  } else {
    result = a < b ? -1 : a > b ? 1 : 0
  }

  return direction === 'asc' ? result : -result
}
