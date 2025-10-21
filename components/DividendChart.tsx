'use client'

import React, { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { getDividendsByCompany } from '@/lib/actions/dividend.actions'

type DividendChartProps = {
  companyId: string
  className?: string
}

type Row = { date: string; value: number }

const DividendChart = ({ companyId, className }: DividendChartProps) => {
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let gone = false
    setLoading(true)
    getDividendsByCompany(companyId)
      .then((rows: any[]) => {
        if (gone) return
        const mapped: Row[] = Array.isArray(rows)
          ? rows
              .map((r: any) => ({
                date: new Date(r.payDate).toISOString().slice(0, 10),
                value: Number(r.dividendYield), // percent value like 2.66
              }))
              .filter((p) => Number.isFinite(p.value))
          : []
        setData(mapped)
      })
      .catch(() => {
        if (gone) return
        setData([])
      })
      .finally(() => {
        if (gone) return
        setLoading(false)
      })
    return () => {
      gone = true
    }
  }, [companyId])

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-muted-foreground">Dividend per Share</span>
        {loading ? <span className="text-xs text-muted-foreground">Loading...</span> : null}
      </div>
      <div className="w-full">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="date" tickMargin={8} />
            <YAxis dataKey="value" width={60} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip formatter={(v: number) => [`${v}%`, 'Dividend Yield']} />
            <Bar dataKey="value" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default DividendChart
