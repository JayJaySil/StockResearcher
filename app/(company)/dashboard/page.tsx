'use client';

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getBasicStockInfo } from '@/lib/actions/setsmart.actions'
import { formatLargeNum, formatPrice } from '@/lib/utils';

const Dashboard = () => {
  const searchParams = useSearchParams()
  const symbol = searchParams.get('symbol')
  const companyId = searchParams.get('companyId')

  if (!symbol || !companyId) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400">No company selected. Please select from your watchlist.</p>
      </div>
    )
  }

  const [basicStockInfo, setBasicStockInfo] = useState<SETSMARTStockQuote>({} as SETSMARTStockQuote)
  const [loading, setLoading] = useState(true)

  // Load watchlist from database
  const loadBasicStockInfo = async () => {
    setLoading(true)
    try {
      const data = await getBasicStockInfo(symbol)
      setBasicStockInfo(data)
      console.log(basicStockInfo)
    } catch (error) {
      console.error('Error loading watchlist:', error)
      } finally {
          setLoading(false)
      }
    }

      // Load watchlist when page loads
  useEffect(() => {
    loadBasicStockInfo()
  },[])

  // Reload watchlist when stock is added or removed
  const handleUpdate = () => {
    loadBasicStockInfo()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!symbol || !companyId) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-400">No company selected. Please select from your watchlist.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-4">
        {symbol} - Company Dashboard
      </h1>
      <div className="space-y-4">
        {/* Company Brief Information card */}
        <div className="p-4 bg-gray-800 rounded">
          <h2 className="text-lg font-semibold text-gray-200 mb-2">Company Brief Information</h2>
            <ul className="text-gray-300 space-y-1">
              <li>Market Cap: <span className="text-white">{formatLargeNum(basicStockInfo.marketCap)} Baht</span></li>
              <li>Number of Shares: <span className="text-white">{formatLargeNum(basicStockInfo.totalVolume)}</span></li>
              <li>Price: <span className="text-white">{formatPrice(basicStockInfo.close)} Baht</span></li>
              <li>P/E: <span className="text-white">{basicStockInfo.pe}</span></li>
              <li>P/B: <span className="text-white">{basicStockInfo.pbv}</span></li>
            </ul>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
