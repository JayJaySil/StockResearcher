import type { Column } from '@/components/PeriodTable'
import { formatLargeNum } from '@/lib/utils'

// Table row type for financial metrics
export type FinancialMetricRow = { key: keyof SETSMARTFinancials; label: string }

// Format a raw cell value for financial tables. Non numeric values is "-"
// - Numbers are compacted (e.g., 1250000 -> "1.25M").
export const formatCell = (v: unknown) => (
  typeof v === 'number' ? formatLargeNum(v) : '-'
)

const parseQuarterLabel = (label: string): { year: number; quarter: number } => {
  const [yearText, quarterText] = label.split(' ')
  return {
    year: Number(yearText),
    quarter: Number(quarterText.slice(1)),
  }
}

const quickSortQuarterLabels = (arr: string[]): string[] => {
  if (arr.length <= 1) return arr.slice()

  const pivotIndex = Math.floor(arr.length / 2)
  const pivot = arr[pivotIndex]
  const pivotParsed = parseQuarterLabel(pivot)

  const left: string[] = []
  const middle: string[] = []
  const right: string[] = []

  for (const label of arr) {
    const parsed = parseQuarterLabel(label)
    if (parsed.year === pivotParsed.year && parsed.quarter === pivotParsed.quarter) {
      middle.push(label)
    } else if (
      parsed.year < pivotParsed.year ||
      (parsed.year === pivotParsed.year && parsed.quarter < pivotParsed.quarter)
    ) {
      left.push(label)
    } else {
      right.push(label)
    }
  }

  return [...quickSortQuarterLabels(left), ...middle, ...quickSortQuarterLabels(right)]
}

// Deduplicate and quicksort quarter labels of the form "YYYY QN" ascending by year then quarter.
export const uniqueSortedQuarterLabels = (labels: string[]): string[] => {
  const unique = Array.from(new Set(labels))
  return quickSortQuarterLabels(unique)
}

// Build a map of latest quarter records keyed by year.
export const latestFinancialByYear = (rows: SETSMARTFinancials[]) => {
  const map = new Map<number, SETSMARTFinancials>()
  for (const rec of rows) {
    if (!rec?.year) continue
    const existing = map.get(rec.year)
    if (!existing || Number(rec.quarter ?? 0) > Number(existing.quarter ?? 0)) {
      map.set(rec.year, rec)
    }
  }
  return map
}

// Sorted list of year labels (ascending) from the latest-by-year map.
export const sortedYearsFromMap = (map: Map<number, SETSMARTFinancials>) => (
  Array.from(map.keys()).sort((a, b) => a - b)
)

// Extract all quarter labels "YYYY QN" from raw rows.
export const extractQuarterLabels = (rows: SETSMARTFinancials[]) => {
  const labels: string[] = []
  for (const record of rows) {
    if (record?.year && record?.quarter) {
      labels.push(`${record.year} Q${record.quarter}`)
    }
  }
  return labels
}

// Return the most recent N quarter labels (ascending order).
export const lastNQuarterLabels = (rows: SETSMARTFinancials[], count = 5) => {
  const sorted = uniqueSortedQuarterLabels(extractQuarterLabels(rows))
  return sorted.slice(-count)
}

// Index financial rows by "YYYY-QN" for quick lookup.
export const recordsByYearQuarter = (rows: SETSMARTFinancials[]) => {
  const map = new Map<string, SETSMARTFinancials>()
  for (const record of rows) {
    if (record?.year && record?.quarter) {
      map.set(`${record.year}-Q${record.quarter}`, record)
    }
  }
  return map
}

const safeLookupMetric = (record: SETSMARTFinancials | undefined, metricKey: keyof SETSMARTFinancials) => {
  if (!record) return undefined
  return record[metricKey]
}

export const buildYearColumns = (
  rows: SETSMARTFinancials[],
): Column<FinancialMetricRow>[] => {
  const latestByYear = latestFinancialByYear(rows)
  const years = sortedYearsFromMap(latestByYear)

  const columns: Column<FinancialMetricRow>[] = [
    { key: 'metric', header: 'Metric', format: (_value, row) => row.label },
  ]

  for (const y of years) {
    columns.push({
      key: String(y),
      header: String(y),
      format: (_value, row) => formatCell(safeLookupMetric(latestByYear.get(y), row.key)),
    })
  }

  return columns
}

export const buildQuarterColumns = (
  rows: SETSMARTFinancials[],
  count = 5,
): Column<FinancialMetricRow>[] => {
  const labels = lastNQuarterLabels(rows, count)
  const byKey = recordsByYearQuarter(rows)

  const columns: Column<FinancialMetricRow>[] = [
    { key: 'metric', header: 'Metric', format: (_value, row) => row.label },
  ]

  for (const label of labels) {
    const [yearText, quarterText] = label.split(' ')
    const quarterKey = `${yearText}-Q${quarterText.slice(1)}`

    columns.push({
      key: label,
      header: label,
      format: (_value, row) => formatCell(safeLookupMetric(byKey.get(quarterKey), row.key)),
    })
  }

  return columns
}
