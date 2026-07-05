const stockQuantityFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
})

export function formatStockQuantity(value) {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }

  return stockQuantityFormatter.format(Math.round(value))
}
