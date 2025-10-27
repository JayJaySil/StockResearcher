"use client"

import React, { useEffect, useState } from "react"
import PeriodTable, { Column } from "@/components/PeriodTable"
import { formatCell, uniqueSortedQuarterLabels } from "@/lib/financial.format"
import { useSearchParams } from "next/navigation"
import { getFinancials } from "@/lib/actions/financial.actions"

type MetricRow = { key: keyof SETSMARTFinancials; label: string }

const FinancialPage = () => {
  const searchParams = useSearchParams()
  const symbol = searchParams.get("symbol")
  const companyId = searchParams.get("companyId")

  if (!symbol || !companyId) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400">No company selected. Please select from your watchlist.</p>
      </div>
    )
  }

  const [financialInfo, setFinancialInfo] = useState<SETSMARTFinancials[]>([])
  const [loading, setLoading] = useState(true)

  const loadFinancialInfo = async () => {
    setLoading(true)
    try {
      const data = await getFinancials(symbol)
      setFinancialInfo(data)
    } catch (error) {
      console.error("Error loading financial information:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFinancialInfo()
  }, [])

  // Pick the latest record for each year
const latestByYear: Record<number, SETSMARTFinancials> = {};

for (const rec of financialInfo) {
  const saved = latestByYear[rec.year];
  // if we don't have this year yet, or this record has a bigger quarter, replace it
  if (!saved || rec.quarter > saved.quarter) {
    latestByYear[rec.year] = rec;
  }
}

// Build columns for the yearly table
const yearCols: Column<MetricRow>[] = [
  { key: "metric", header: "Metric", format: (rawColumn: unknown, row) => row.label },
];

// make a sorted list of unique years (ascending)
const yearSet = new Set<number>();
for (const rec of financialInfo) {
  if (rec.year) yearSet.add(rec.year);
}
const years = Array.from(yearSet).sort((a, b) => a - b);

// add a column for each year, grabbing values from latestByYear
for (const y of years) {
  yearCols.push({
    key: String(y),
    header: String(y),
    format: (_: unknown, row) => {
      const rec: any = latestByYear[y];
      return formatCell(rec ? rec[row.key] : undefined);
    },
  });
}

// Build quarter labels eg. "2024 Q4"
const quarterLabels: string[] = [];
for (const record of financialInfo) {
  if (record.year && record.quarter) {
    quarterLabels.push(`${record.year} Q${record.quarter}`);
  }
}

  const uniqueQuarterLabels = uniqueSortedQuarterLabels(quarterLabels)

// keep only the 5 most recent (end of the list)
const lastFiveQuarterLabels = uniqueQuarterLabels.slice(-5);

// map "YYYY-QX" -> record for quick lookup
const recordByYQ: Record<string, SETSMARTFinancials> = {};
for (const record of financialInfo) {
  if (record.year && record.quarter) {
    recordByYQ[`${record.year}-Q${record.quarter}`] = record;
  }
}

// Create array of collumn definitions
const quarterCols: Column<MetricRow>[] = [
  { key: "metric", header: "Metric", format: (rawMetric: unknown, row) => row.label },
];

for (const label of lastFiveQuarterLabels) {
  // label is "2024 Q4" -> convert to "2024-Q4" for map key
  const [yearText, qText] = label.split(" ");
  const yearNum = Number(yearText);           // "2024" -> 2024
  const quarterNum = Number(qText.slice(1));     // "Q4"   -> 4
  const key = `${yearNum}-Q${quarterNum}`;

  quarterCols.push({
    key: label,
    header: label,
    format: (rawLabel: unknown, row) => {
      const rec: any = recordByYQ[key];
      return formatCell(rec ? rec[row.key] : undefined);
    },
  });
}

  // Balance sheet metrics
  const balanceMetrics: MetricRow[] = [
    { key: "totalAssets", label: "Total Assets (THB thousands)" },
    { key: "totalLiabilities", label: "Total Liabilities (THB thousands)" },
    { key: "shareholderEquity", label: "Shareholder Equity (THB thousands)" },
    { key: "paidupShareCapital", label: "Paid-up Share Capital (THB thousands)" },
  ]

  // Profit/Loss metrics
  // Yearly: use accumulated values
  const plMetricsYearly: MetricRow[] = [
    { key: "totalRevenueAccum", label: "Total Revenue (THB thousands)" },
    { key: "ebitAccum", label: "EBIT (THB thousands)" },
    { key: "netProfitAccum", label: "Net Profit (THB thousands)" },
    { key: "epsAccum", label: "EPS (THB thousands)" },
  ]
  // Quarterly: use quarter values (non-accumulated)
  const plMetricsQuarterly: MetricRow[] = [
    { key: "totalRevenueQuarter", label: "Total Revenue (THB thousands)" },
    { key: "ebitQuarter", label: "EBIT (THB thousands)" },
    { key: "netProfitQuarter", label: "Net Profit (THB thousands)" },
    { key: "epsQuarter", label: "EPS (THB thousands)" },
  ]

  const cashFlowMetrics: MetricRow[] = [
    { key: "operatingCashFlow", label: "Operating Cash Flow (THB thousands)" },
    { key: "investingCashFlow", label: "Investing Cash Flow (THB thousands)" },
    { key: "financingCashFlow", label: "Financing Cash Flow (THB thousands)" },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financial Data - {symbol}</h1>

      <PeriodTable
        title="Balance Sheet"
        yearly={{ columns: yearCols, rows: balanceMetrics }}
        quarterly={{ columns: quarterCols, rows: balanceMetrics }}
      />

      <PeriodTable
        title="Profit / Loss"
        yearly={{ columns: yearCols, rows: plMetricsYearly }}
        quarterly={{ columns: quarterCols, rows: plMetricsQuarterly }}
      />

      <PeriodTable
        title="Cash Flow"
        yearly={{ columns: yearCols, rows: cashFlowMetrics }}
        quarterly={{ columns: quarterCols, rows: cashFlowMetrics }}
      />
    </div>
  )
}

export default FinancialPage
