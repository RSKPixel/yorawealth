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

export function getTransactionMonthKey(dateStr) {
  if (!dateStr) return null

  const [yearPart, monthPart] = dateStr.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)

  if (!year || !month) {
    return null
  }

  return `${yearPart}-${monthPart}`
}

export function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === 'all') {
    return 'All months'
  }

  const [yearPart, monthPart] = monthKey.split('-')
  const date = new Date(`${yearPart}-${monthPart}-01T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return monthKey
  }

  return date.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })
}

function monthOrderInFinancialYear(monthKey, fyStartYear) {
  const [yearPart, monthPart] = monthKey.split('-').map(Number)
  if (!yearPart || !monthPart) {
    return 0
  }

  if (monthPart >= 4) {
    return (yearPart - fyStartYear) * 12 + (monthPart - 4)
  }

  return (yearPart - fyStartYear) * 12 + (monthPart + 8)
}

export function collectMonthsInFinancialYear(transactions, financialYear) {
  if (!financialYear || financialYear === 'all') {
    return []
  }

  const fyStartYear = Number(financialYear.split('-')[0])
  const monthSet = new Set()

  for (const row of transactions ?? []) {
    const rowFy = getIndianFinancialYear(row.transaction_date)
    if (rowFy !== financialYear) {
      continue
    }

    const monthKey = getTransactionMonthKey(row.transaction_date)
    if (monthKey) {
      monthSet.add(monthKey)
    }
  }

  return Array.from(monthSet).sort(
    (left, right) =>
      monthOrderInFinancialYear(left, fyStartYear) -
      monthOrderInFinancialYear(right, fyStartYear),
  )
}
