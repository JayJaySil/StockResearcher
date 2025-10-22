// Server actions for dividend CRUD and queries.
'use server'

import { connectToDatabase } from '@/database/mongoose'
import { Dividend } from '@/database/models/dividend.model'
import { v4 as uuidv4 } from 'uuid'

type DividendInput = { payDate: Date | string; divPerShare: number }

export type BulkUpsertDividendsResult =
  | { success: true; count: number }
  | { success: false; error: string }

// Replace all dividend rows for a company with the provided items.
// Returns a discriminated result with `count` on success.
export async function bulkUpsertDividends(
  companyId: string,
  items: DividendInput[],
): Promise<BulkUpsertDividendsResult> {
  try {
    if (!companyId) return { success: false, error: 'companyId is required' }
    if (!Array.isArray(items) || items.length === 0) return { success: false, error: 'No items to save' }

    await connectToDatabase()

    // Simple strategy: replace all dividends for this company
    await Dividend.deleteMany({ companyId })

    const docs = items.map((i) => ({
      dividendId: uuidv4(),
      companyId,
      payDate: i.payDate instanceof Date ? i.payDate : new Date(i.payDate),
      divPerShare: i.divPerShare,
    }))

    const res = await Dividend.insertMany(docs)
    return { success: true, count: res.length }
  } catch (err) {
    console.error('bulkUpsertDividends error', err)
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
