"use client"

import React, { useEffect, useState } from "react"
import PeriodTable from "@/components/PeriodTable"
import { buildQuarterColumns, buildYearColumnsFromYearlyRows, FinancialMetricRow } from "@/lib/financial.format"
import { useSearchParams } from "next/navigation"
import { getFinancials, toYearlyBase } from "@/lib/actions/financial.actions"

type MetricRow = FinancialMetricRow

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
  const [yearlyRows, setYearlyRows] = useState<Record<string, unknown>[]>([])
  const [yearCols, setYearCols] = useState<Column<Record<string, unknown>>[]>([])
  const [loading, setLoading] = useState(true)

  const loadFinancialInfo = async () => {
    setLoading(true)
    try {
      const data = await getFinancials(symbol)
      setFinancialInfo(data)
      const yRows = await toYearlyBase(data)
      setYearlyRows(yRows)
      setYearCols(buildYearColumnsFromYearlyRows(yRows))
    } catch (error) {
      console.error("Error loading financial information:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFinancialInfo()
  }, [])

  const quarterCols = buildQuarterColumns(financialInfo, 5)

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

  // Filter yearly rows per section based on metric key emitted by toYearlyBase
  const filterYearly = (keys: string[]) => yearlyRows.filter(r => keys.includes(String((r as any).key)))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financial Data - {symbol}</h1>

      <PeriodTable
        title="Balance Sheet"
        yearly={{ columns: yearCols, rows: filterYearly(["totalAssets","totalLiabilities","shareholderEquity","paidupShareCapital"]) }}
        quarterly={{ columns: quarterCols, rows: balanceMetrics }}
      />

      <PeriodTable
        title="Profit / Loss"
        yearly={{ columns: yearCols, rows: filterYearly(["totalRevenueAccum","ebitAccum","netProfitAccum","epsAccum"]) }}
        quarterly={{ columns: quarterCols, rows: plMetricsQuarterly }}
      />

      <PeriodTable
        title="Cash Flow"
        yearly={{ columns: yearCols, rows: filterYearly(["operatingCashFlow","investingCashFlow","financingCashFlow"]) }}
        quarterly={{ columns: quarterCols, rows: cashFlowMetrics }}
      />
    </div>
  )
}

export default FinancialPage
