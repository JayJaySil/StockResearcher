// Server actions for dividend CRUD and queries.
'use server'

import { connectToDatabase } from '@/database/mongoose'
import { Dividend } from '@/database/models/dividend.model'
import { v4 as uuidv4 } from 'uuid'

type DividendInput = { payDate: Date | string; dividendYield: number }
type SheetRow = Array<unknown>

export type storeDividendsResult =
  | { success: true; count: number }
  | { success: false; error: string }

// Replace all dividend rows for a company with the provided items.
// Returns a discriminated result with `count` on success.
export async function storeDividendsInDB(
  companyId: string,
  items: DividendInput[],
): Promise<storeDividendsResult> {
  try {
    if (!companyId) return { success: false, error: 'companyId is required' }
    if (!Array.isArray(items) || items.length === 0) return { success: false, error: 'No items to save' }

    await connectToDatabase()

    // Replace all dividends for this company in database
    await Dividend.deleteMany({ companyId })

    const docs = items.map((i) => ({
      dividendId: uuidv4(),
      companyId,
      payDate: i.payDate instanceof Date ? i.payDate : new Date(i.payDate),
      dividendYield: i.dividendYield,
    }))

    const res = await Dividend.insertMany(docs)
    return { success: true, count: res.length }
  } catch (err) {
    console.error('storeDividendsInDB error', err)
    return { success: false, error: 'Failed to save dividends' }
  }
}

// Query all dividends for a company (ascending by payDate).
export async function getDividendsByCompany(companyId: string) {
  try {
    if (!companyId) return []
    await connectToDatabase()
    const rows = await Dividend.find({ companyId }).sort({ payDate: 1 }).lean()
    return JSON.parse(JSON.stringify(rows))
  } catch (e) {
    console.error('getDividendsByCompany error', e)
    return []
  }
}

// Import dividend spreadsheet rows, validate them, and persist to MongoDB.
export async function importDividendsFromRows(params: {
  companyId: string
  symbol: string
  rows: SheetRow[]
}): Promise<storeDividendsResult> {
  const { companyId, symbol, rows } = params

  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, error: 'Spreadsheet is empty' }
  }

  const header = findHeaderRow(rows)
  if (!header) {
    return { success: false, error: 'Unrecognized format. Could not find header row with Symbol, Payment Date, Dividend' }
  }

  const { rowIndex, columns } = header
  const startRow = rowIndex + 1
  const working: DividendInput[] = []
  let currentRow = startRow

  while (currentRow < rows.length) {
    const row = rows[currentRow] || []
    const rawSymbol = String(row[columns.symbol] ?? '').trim()
    const rawPayDate = row[columns.paymentDate]
    const rawYield = row[columns.dividendYield]

    const isBlank = [rawSymbol, rawPayDate, rawYield].every(
      (v) => v == null || (typeof v === 'string' && v.trim() === ''),
    )
    if (isBlank) break

    if (rawSymbol && rawSymbol.toUpperCase() !== symbol.toUpperCase()) {
      return { success: false, error: `Row ${currentRow + 1} has symbol ${rawSymbol}, expected ${symbol}` }
    }

    const payDate = coerceToDate(rawPayDate)
    if (!payDate) {
      return { success: false, error: `Row ${currentRow + 1} has a payment date I couldn't understand` }
    }

    let cleanedYield = rawYield as number | string | null | undefined
    if (typeof cleanedYield !== 'number') {
      const justNumbers = String(cleanedYield ?? '').replace(/[^0-9.-]/g, '')
      cleanedYield = parseFloat(justNumbers)
    }
    if (Number.isNaN(cleanedYield)) {
      return { success: false, error: `Row ${currentRow + 1} dividend yield is not a valid number` }
    }
    const finalYield = Math.round((cleanedYield as number) * 100) / 100

    working.push({ payDate, dividendYield: finalYield })
    currentRow += 1
  }

  if (working.length === 0) {
    return { success: false, error: 'No dividend rows found to import' }
  }

  return storeDividendsInDB(companyId, working)
}

function coerceToDate(value: unknown): Date | null {
  // Excel often gives numbers, convert serials to JS Dates.
  if (typeof value === 'number') {
    return new Date(Math.round((value - 25569) * 86400 * 1000))
  }
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'string') {
    return parseUSDate(value)
  }
  return null
}

function parseUSDate(input: string): Date | null {
  // Accept strings like "05/23/2025" or "5/23/2025" (with optional trailing *).
  const trimmedDate = String(input).trim()
  const cleanedDate = trimmedDate.endsWith('*') ? trimmedDate.slice(0, -1).trim() : trimmedDate

  const digits: number[] = []
  let numberBuffer = ''
  for (let index = 0; index < cleanedDate.length; index++) {
    const character = cleanedDate[index]
    if (character >= '0' && character <= '9') {
      numberBuffer += character
    } else if (character === '/') {
      if (numberBuffer.length === 0) return null
      digits.push(Number(numberBuffer))
      numberBuffer = ''
    } else if (character === ' ') {
      continue
    } else {
      return null
    }
  }
  if (numberBuffer.length > 0) digits.push(Number(numberBuffer))
  if (digits.length !== 3) return null

  const [month, day, year] = digits
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) return null

  const parsedDate = new Date(year, month - 1, day)
  if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) return null
  return parsedDate
}

function findHeaderRow(rows: SheetRow[]): { rowIndex: number; columns: Record<'symbol' | 'dividendYield' | 'paymentDate', number> } | null {
  // Look through the first 30 rows for a header that mentions Symbol/Payment Date/Dividend Yield.
  const SYMBOL_COL = 0
  const YIELD_COL = 12
  const PAYDATE_COL = 8

  const MAX_SCAN_ROWS = Math.min(rows.length, 30)
  for (let idx = 0; idx < MAX_SCAN_ROWS; idx++) {
    const row = rows[idx]
    if (!row) continue

    const yieldHeader = String(row[YIELD_COL] ?? '').toLowerCase()
    const symHeader = String(row[SYMBOL_COL] ?? '').toLowerCase()
    const payHeader = String(row[PAYDATE_COL] ?? '').toLowerCase()

    const looksValid =
      yieldHeader.includes('yield') &&
      yieldHeader.includes('dividend') &&
      symHeader.includes('symbol') &&
      payHeader.includes('payment') &&
      payHeader.includes('date')

    if (looksValid) {
      return {
        rowIndex: idx,
        columns: { symbol: SYMBOL_COL, dividendYield: YIELD_COL, paymentDate: PAYDATE_COL },
      }
    }
  }
  return null
}
