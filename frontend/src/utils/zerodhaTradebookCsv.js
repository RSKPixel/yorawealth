export const ZERODHA_TRADEBOOK_CSV_TEMPLATE_ID = 'zerodha_tradebook_csv'

export function isZerodhaTradebookTemplate(templateId) {
  return templateId === ZERODHA_TRADEBOOK_CSV_TEMPLATE_ID
}

export function validateZerodhaTradebookFilename(fileName, clientId) {
  if (!clientId?.trim()) {
    return 'Set your Zerodha client ID in Settings → Profile.'
  }

  const normalizedName = fileName.toLowerCase()
  const normalizedClientId = clientId.trim().toLowerCase()
  const expectedPrefix = `tradebook-${normalizedClientId}-`

  if (!normalizedName.includes(expectedPrefix)) {
    return `Tradebook filename should include ${clientId.toUpperCase()} (e.g. tradebook-${clientId.toUpperCase()}-EQ.csv).`
  }

  return null
}

// Keep in sync with backend/app/templates/tradebooks/zerodha_tradebook.csv
export const ZERODHA_TRADEBOOK_CSV_COLUMNS = [
  'symbol',
  'isin',
  'trade_date',
  'exchange',
  'segment',
  'series',
  'trade_type',
  'auction',
  'quantity',
  'price',
  'trade_id',
  'order_id',
  'order_execution_time',
]

function normalizeCsvHeader(value) {
  return value.trim().replace(/^\uFEFF/, '').toLowerCase()
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells
}

function readFirstLines(text, count) {
  const lines = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      current += char
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[index + 1] === '\n') {
        index += 1
      }
      if (current.trim()) {
        lines.push(current)
      }
      current = ''
      if (lines.length >= count) {
        break
      }
      continue
    }

    current += char
  }

  if (current.trim() && lines.length < count) {
    lines.push(current)
  }

  return lines
}

function validateSampleRow(values) {
  const tradeType = (values.trade_type ?? '').trim().toLowerCase()
  if (tradeType !== 'buy' && tradeType !== 'sell') {
    return 'Invalid Zerodha tradebook format. trade_type must be buy or sell.'
  }

  const tradeDate = (values.trade_date ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tradeDate)) {
    return 'Invalid Zerodha tradebook format. trade_date must be YYYY-MM-DD.'
  }

  for (const field of ['quantity', 'price']) {
    const rawValue = (values[field] ?? '').trim()
    if (rawValue === '' || Number.isNaN(Number(rawValue))) {
      return `Invalid Zerodha tradebook format. ${field} must be numeric.`
    }
  }

  return null
}

export function validateZerodhaTradebookCsvContent(text) {
  if (!text?.trim()) {
    return 'Selected file is empty.'
  }

  const lines = readFirstLines(text, 2)
  if (!lines.length) {
    return 'Tradebook CSV has no header row.'
  }

  const headerCells = parseCsvLine(lines[0]).map(normalizeCsvHeader)
  const expectedColumns = ZERODHA_TRADEBOOK_CSV_COLUMNS.map(normalizeCsvHeader)

  if (headerCells.length !== expectedColumns.length) {
    const missing = expectedColumns.filter((column) => !headerCells.includes(column))
    if (missing.length) {
      return `Invalid Zerodha tradebook format. Missing columns: ${missing.join(', ')}.`
    }

    return `Invalid Zerodha tradebook format. Expected header: ${ZERODHA_TRADEBOOK_CSV_COLUMNS.join(', ')}.`
  }

  for (let index = 0; index < expectedColumns.length; index += 1) {
    if (headerCells[index] !== expectedColumns[index]) {
      return `Invalid Zerodha tradebook format. Expected header: ${ZERODHA_TRADEBOOK_CSV_COLUMNS.join(', ')}.`
    }
  }

  if (lines.length < 2) {
    return 'Tradebook CSV has no transaction rows.'
  }

  const rowCells = parseCsvLine(lines[1])
  const rowValues = Object.fromEntries(
    ZERODHA_TRADEBOOK_CSV_COLUMNS.map((column, index) => [column, rowCells[index] ?? '']),
  )

  return validateSampleRow(rowValues)
}

export async function validateZerodhaTradebookCsvFile(file) {
  const text = await file.text()
  return validateZerodhaTradebookCsvContent(text)
}

export async function validateTradebookFormat(file, templateId) {
  if (templateId === ZERODHA_TRADEBOOK_CSV_TEMPLATE_ID) {
    return validateZerodhaTradebookCsvFile(file)
  }

  return 'Unsupported tradebook template.'
}
