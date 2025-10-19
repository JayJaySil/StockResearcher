'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'

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
      <div className="p-4 bg-gray-800 rounded">
        <p className="text-gray-300">Company ID: {companyId}</p>
        <p className="text-gray-400 mt-2">Summariser content will go here...</p>
      </div>
    </div>
  )
}

export default Summariser