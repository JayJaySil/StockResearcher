import { formatLargeNum } from '@/lib/utils'

// Format a raw cell value for financial tables. Non numeric values is "-"
// - Numbers are compacted (e.g., 1250000 -> "1.25M").
export const formatCell = (v: unknown) => (
  typeof v === 'number' ? formatLargeNum(v) : '-'
)

// Deduplicate and quicksort quarter labels of the form "YYYY QN" ascending by year then quarter.
export const uniqueSortedQuarterLabels = (labels: string[]): string[] => {
  const unique = Array.from(new Set(labels));

  const quickSort = (arr: string[]): string[] => {
    if (arr.length <= 1) return arr.slice();

    const pivotIndex = Math.floor(arr.length / 2);
    const pivot = arr[pivotIndex];
    const [pivotYearText, pivotQuarterText] = pivot.split(' ');
    const pivotYear = Number(pivotYearText);
    const pivotQuarter = Number(pivotQuarterText.slice(1));

    const left: string[] = [];
    const middle: string[] = [];
    const right: string[] = [];

    for (const label of arr) {
      const [yearText, quarterLabel] = label.split(' ');
      const year = Number(yearText);
      const quarter = Number(quarterLabel.slice(1));

      if (year === pivotYear && quarter === pivotQuarter) {
        middle.push(label);
      } else if (year < pivotYear || (year === pivotYear && quarter < pivotQuarter)) {
        left.push(label);
      } else {
        right.push(label);
      }
    }

    return [...quickSort(left), ...middle, ...quickSort(right)];
  };

  return quickSort(unique);
}
