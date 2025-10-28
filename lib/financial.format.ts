import { formatLargeNum } from '@/lib/utils'

// Table row type for financial metrics
export type FinancialMetricRow = { key: keyof SETSMARTFinancials; label: string }

// Format a raw cell value for financial tables. Non numeric values is "-"
// - Numbers are compacted (e.g., 1250000 -> "1.25M").
export const formatCell = (value: unknown) => (
  typeof value === 'number' ? formatLargeNum(value) : '-'
)

//Parses '2024 Q1' To an object  { year: 2024, quarter: 1 }
const parseQuarterLabel = (quarterLabel: string): { year: number; quarter: number } => {
  const [yearText, quarterText] = quarterLabel.split(' ')
  return {
    year: Number(yearText),
    quarter: Number(quarterText.slice(1)),
  }
}

const quickSortQuarterLabels = (labels: string[]): string[] => {
  if (labels.length <= 1) return labels.slice()

  const pivotIndex = Math.floor(labels.length / 2)
  const pivotLabel = labels[pivotIndex]
  const pivot = parseQuarterLabel(pivotLabel)

  const earlierLabels: string[] = []
  const sameLabels: string[] = []
  const laterLabels: string[] = []

  for (const quarterLabel of labels) {
    const parsedLabel = parseQuarterLabel(quarterLabel)
    // Group labels strictly earlier than pivot into earlier, equal into same, and later into later.
    if (parsedLabel.year === pivot.year && parsedLabel.quarter === pivot.quarter) {
      sameLabels.push(quarterLabel)
    } else if (
      parsedLabel.year < pivot.year ||
      (parsedLabel.year === pivot.year && parsedLabel.quarter < pivot.quarter)
    ) {
      earlierLabels.push(quarterLabel)
    } else {
      laterLabels.push(quarterLabel)
    }
  }

  // Combine recursively sorted partitions with the pivot-equivalent labels in the middle.
  return [
    ...quickSortQuarterLabels(earlierLabels),
    ...sameLabels,
    ...quickSortQuarterLabels(laterLabels),
  ]
}

// Deduplicate and quicksort quarter labels of the form "YYYY QN" ascending by year then quarter.
export const uniqueSortedQuarterLabels = (labels: string[]): string[] => {
  const uniqueLabels = Array.from(new Set(labels))
  return quickSortQuarterLabels(uniqueLabels)
}

// Build a map of latest quarter records keyed by year.
// (Removed) latest-by-year helpers are redundant when using toYearlyBase.

// Extract all quarter labels "YYYY QN" from raw rows.
export const extractQuarterLabels = (rows: SETSMARTFinancials[]) => {
  const quarterLabels: string[] = []
  for (const row of rows) {
    if (row?.year && row?.quarter) {
      quarterLabels.push(`${row.year} Q${row.quarter}`)
    }
  }
  return quarterLabels
}

// Return the most recent N quarter labels (ascending order).
export const lastNQuarterLabels = (rows: SETSMARTFinancials[], count = 5) => {
  const sortedLabels = uniqueSortedQuarterLabels(extractQuarterLabels(rows))
  return sortedLabels.slice(-count)
}

// Index financial rows by "YYYY-QN" for quick lookup.
export const recordsByYearQuarter = (rows: SETSMARTFinancials[]) => {
  const indexByYearQuarter = new Map<string, SETSMARTFinancials>()
  for (const row of rows) {
    if (row?.year && row?.quarter) {
      indexByYearQuarter.set(`${row.year}-Q${row.quarter}`, row)
    }
  }
  return indexByYearQuarter
}

const safeLookupMetric = (record: SETSMARTFinancials | undefined, metricKey: keyof SETSMARTFinancials) => {
  if (!record) return undefined
  return record[metricKey]
}

// Build yearly columns from rows returned by toYearlyBase.
// Each row looks like: { key: 'totalAssets', metric: 'Total Assets', '2021': 123, '2022': 456 }
export const buildYearColumnsFromYearlyRows = (
  yearlyRows: Array<Record<string, unknown>>,
): Column<Record<string, unknown>>[] => {
  // simple check if a key looks like a year (e.g., "2021")
  const isYearKey = (k: string) => {
    if (k.length !== 4) return false
    for (let i = 0; i < 4; i++) {
      const c = k[i]
      if (c < '0' || c > '9') return false
    }
    return true
  }

  // find all years that look like "2021"
  const yearKeys: string[] = []
  for (const yearlyRow of yearlyRows) {
    const rowKeys = Object.keys(yearlyRow)
    for (const key of rowKeys) {
      if (isYearKey(key)) {
        if (!yearKeys.includes(key)) {
          yearKeys.push(key)
        }
      }
    }
  }

  // sort years from old to new
  yearKeys.sort((a, b) => Number(a) - Number(b))

  // first column is just the metric name
  const columns: Column<Record<string, unknown>>[] = [
    { key: 'metric', header: 'Metric', format: (_unused, row: any) => (row as any).metric ?? (row as any).label ?? '-' },
  ]

  // then one column per year
  for (const yearKey of yearKeys) {
    columns.push({
      key: yearKey,
      header: yearKey,
      format: (value) => formatCell(value),
    })
  }

  return columns
}

export const buildQuarterColumns = (
  rows: SETSMARTFinancials[],
  count = 5,
): Column<FinancialMetricRow>[] => {
  const recentQuarterLabels = lastNQuarterLabels(rows, count)
  const recordsIndex = recordsByYearQuarter(rows)

  // First column always lists the metric label.
  const columns: Column<FinancialMetricRow>[] = [
    { key: 'metric', header: 'Metric', format: (_value, row) => row.label },
  ]

  // Append a column for each recent quarter label.
  for (const quarterLabel of recentQuarterLabels) {
    const [yearText, quarterText] = quarterLabel.split(' ')
    const yearQuarterKey = `${yearText}-Q${quarterText.slice(1)}`

    columns.push({
      key: quarterLabel,
      header: quarterLabel,
      format: (_value, row) => formatCell(safeLookupMetric(recordsIndex.get(yearQuarterKey), row.key)),
    })
  }

  return columns
}
