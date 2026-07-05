function normalizeNavHistory(navHistory) {
  return (navHistory ?? [])
    .map((point) => ({
      date: point.date,
      nav: Number(point.nav),
    }))
    .filter((point) => point.date && !Number.isNaN(point.nav))
    .sort((left, right) => left.date.localeCompare(right.date))
}

function findNavOnOrBefore(series, dateStr) {
  let result = null
  for (const point of series) {
    if (point.date <= dateStr) {
      result = point
    } else {
      break
    }
  }
  return result
}

function lastNavInYear(series, year) {
  const prefix = `${year}-`
  let result = null
  for (const point of series) {
    if (point.date.startsWith(prefix)) {
      result = point
    }
  }
  return result
}

function pctChange(fromNav, toNav) {
  if (fromNav == null || toNav == null || fromNav === 0) {
    return null
  }
  return ((toNav / fromNav) - 1) * 100
}

function annualizedPctChange(fromNav, toNav, years) {
  if (fromNav == null || toNav == null || fromNav <= 0 || years <= 0) {
    return null
  }

  const totalReturn = toNav / fromNav
  if (totalReturn <= 0) {
    return null
  }

  return (totalReturn ** (1 / years) - 1) * 100
}

function subtractYears(dateStr, years) {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setFullYear(date.getFullYear() - years)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function subtractDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setDate(date.getDate() - days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const YEAR_TO_DATE_DAYS = 365

export function computePeriodReturns(navHistory) {
  const series = normalizeNavHistory(navHistory)
  const latest = series[series.length - 1]
  if (!latest) {
    return []
  }

  const periods = [
    {
      label: 'Year to date',
      years: null,
      startNav:
        findNavOnOrBefore(series, subtractDays(latest.date, YEAR_TO_DATE_DAYS))
          ?.nav ?? null,
      endNav: latest.nav,
    },
    {
      label: '2Y',
      years: 2,
      startNav: findNavOnOrBefore(series, subtractYears(latest.date, 2))?.nav ?? null,
      endNav: latest.nav,
    },
    {
      label: '3Y',
      years: 3,
      startNav: findNavOnOrBefore(series, subtractYears(latest.date, 3))?.nav ?? null,
      endNav: latest.nav,
    },
    {
      label: '5Y',
      years: 5,
      startNav: findNavOnOrBefore(series, subtractYears(latest.date, 5))?.nav ?? null,
      endNav: latest.nav,
    },
    {
      label: '10Y',
      years: 10,
      startNav: findNavOnOrBefore(series, subtractYears(latest.date, 10))?.nav ?? null,
      endNav: latest.nav,
    },
  ]

  return periods.map((period) => ({
    label: period.label,
    changePct:
      period.years == null
        ? pctChange(period.startNav, period.endNav)
        : annualizedPctChange(period.startNav, period.endNav, period.years),
  }))
}

export function computeYearlyReturns(navHistory, yearCount = 10) {
  const series = normalizeNavHistory(navHistory)
  const latest = series[series.length - 1]
  if (!latest) {
    return []
  }

  const currentYear = Number(latest.date.slice(0, 4))
  const rows = []

  for (let offset = 0; offset < yearCount; offset += 1) {
    const year = currentYear - offset
    const endPoint =
      year === currentYear ? latest : lastNavInYear(series, year)
    const startPoint = lastNavInYear(series, year - 1)

    rows.push({
      year,
      changePct:
        endPoint && startPoint
          ? pctChange(startPoint.nav, endPoint.nav)
          : null,
    })
  }

  return rows
}
