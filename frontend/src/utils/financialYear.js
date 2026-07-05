export function getIndianFinancialYear(dateStr) {
  const [yearPart, monthPart] = dateStr.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)

  if (!year || !month) {
    return null
  }

  const startYear = month >= 4 ? year : year - 1
  return `${startYear}-${String(startYear + 1).slice(-2)}`
}

export function getCurrentIndianFinancialYear(referenceDate = new Date()) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() + 1
  const startYear = month >= 4 ? year : year - 1
  return `${startYear}-${String(startYear + 1).slice(-2)}`
}

export function formatFinancialYearLabel(fy) {
  if (fy === 'all') {
    return 'All years'
  }

  const [startYear, endSuffix] = fy.split('-')
  return `FY ${startYear.slice(-2)}-${endSuffix}`
}

export function collectFinancialYears(transactions) {
  const years = new Set()

  for (const row of transactions ?? []) {
    const fy = getIndianFinancialYear(row.transaction_date)
    if (fy) {
      years.add(fy)
    }
  }

  return Array.from(years).sort((left, right) => right.localeCompare(left))
}
