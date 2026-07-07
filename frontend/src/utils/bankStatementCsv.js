export const BANK_STATEMENT_CSV_COLUMNS = ['date', 'desc', 'ref', 'debit', 'credit']

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

export function validateBankStatementCsvContent(text) {
  if (!text?.trim()) {
    return 'Selected file is empty.'
  }

  const lines = readFirstLines(text, 2)
  if (!lines.length) {
    return 'CSV has no header row.'
  }

  const headerCells = parseCsvLine(lines[0]).map(normalizeCsvHeader)
  const expectedColumns = BANK_STATEMENT_CSV_COLUMNS.map(normalizeCsvHeader)
  const missing = expectedColumns.filter((column) => !headerCells.includes(column))

  if (missing.length) {
    return `Invalid bank statement CSV. Missing columns: ${missing.join(', ')}. Expected: ${BANK_STATEMENT_CSV_COLUMNS.join(', ')}.`
  }

  if (lines.length < 2) {
    return 'CSV has no transaction rows.'
  }

  return null
}

export async function validateBankStatementCsvFile(file) {
  const text = await file.text()
  return validateBankStatementCsvContent(text)
}
