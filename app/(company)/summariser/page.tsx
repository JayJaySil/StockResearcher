'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import OneReportSummarizer from '@/components/OneReportSummarizer'

const Summariser = () => {
  const searchParams = useSearchParams()
  const symbol = searchParams.get('symbol')
  const companyId = searchParams.get('companyId')

  if (!symbol || !companyId) {
    return <div className="text-gray-400">No company selected</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-4">
        {symbol} - 56-1 Summariser
      </h1>
      <div className="space-y-4">
        <OneReportSummarizer symbol={symbol} companyId={companyId} />
      </div>
    </div>
  )
}

export default Summariser
