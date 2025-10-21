"use client"

import React, { useEffect, useState } from "react"
import PeriodTable, { Column } from "@/components/PeriodTable"
import { formatCell } from "@/lib/financial.format"
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

  // Make a list of years (ascending)
  const years = Array.from(
    new Set(financialInfo.map((f) => f.year).filter((y): y is number => !!y))
  ).sort((a, b) => a - b)

  // For each year, keep the latest quarter we have
  const latestByYear: Record<number, SETSMARTFinancials> = {}
  for (const r of financialInfo) {
    if (!r.year) continue
    const prev = latestByYear[r.year]
    if (!prev || (r.quarter ?? 0) > (prev.quarter ?? 0)) latestByYear[r.year] = r
  }

  // Build columns for yearly table
  const yearCols: Column<MetricRow>[] = [
    { key: "metric", header: "Metric", format: (_: unknown, row) => row.label },
  ]
  for (const y of years) {
    yearCols.push({
      key: String(y),
      header: String(y),
      format: (_: unknown, row) => formatCell((latestByYear[y] as any)?.[row.key]),
    })
  }

  // Build quarter labels like "2024 Q4" (ascending)
  const quarterLabelsAll: string[] = []
  for (const r of financialInfo) {
    if (r.year && r.quarter) quarterLabelsAll.push(`${r.year} Q${r.quarter}`)
  }
  const quarters = Array.from(new Set(quarterLabelsAll))
    .sort((a, b) => {
      const [ya, qa] = a.split(" Q").map(Number)
      const [yb, qb] = b.split(" Q").map(Number)
      return ya === yb ? qa - qb : ya - yb
    })
    .slice(-5) // only keep 5 most recent

  // Map quarter string to record
  const byYQ: Record<string, SETSMARTFinancials> = {}
  for (const r of financialInfo) {
    if (r.year && r.quarter) byYQ[`${r.year}-Q${r.quarter}`] = r
  }

  // Build columns for quarterly table
  const quarterCols: Column<MetricRow>[] = [
    { key: "metric", header: "Metric", format: (_: unknown, row) => row.label },
  ]
  for (const lbl of quarters) {
    quarterCols.push({
      key: lbl,
      header: lbl,
      format: (_: unknown, row) => {
        const [y, q] = lbl.split(" ")
        const rec = byYQ[`${Number(y)}-Q${Number(q.slice(1))}`] as any
        return formatCell(rec?.[row.key])
      },
    })
  }

  // Metric lists: simple and explicit
  const balanceMetrics: MetricRow[] = [
    { key: "totalAssets", label: "Total Assets" },
    { key: "totalLiabilities", label: "Total Liabilities" },
    { key: "shareholderEquity", label: "Shareholder Equity" },
    { key: "paidupShareCapital", label: "Paid-up Share Capital" },
  ]

  const plMetrics: MetricRow[] = [
    { key: "totalRevenueAccum", label: "Total Revenue (Accum)" },
    { key: "ebitAccum", label: "EBIT (Accum)" },
    { key: "netProfitAccum", label: "Net Profit (Accum)" },
    { key: "epsAccum", label: "EPS (Accum)" },
  ]

  const cashFlowMetrics: MetricRow[] = [
    { key: "operatingCashFlow", label: "Operating Cash Flow" },
    { key: "investingCashFlow", label: "Investing Cash Flow" },
    { key: "financingCashFlow", label: "Financing Cash Flow" },
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
        yearly={{ columns: yearCols, rows: plMetrics }}
        quarterly={{ columns: quarterCols, rows: plMetrics }}
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
