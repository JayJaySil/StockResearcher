import { formatLargeNum } from '@/lib/utils'

// Format a raw cell value for financial tables.
// - Numbers are compacted (e.g., 1250000 -> "1.25M").
// - Non-numeric values render as a dash for consistency with empty cells.
export const formatCell = (v: unknown) => (
  typeof v === 'number' ? formatLargeNum(v) : '-'
)
