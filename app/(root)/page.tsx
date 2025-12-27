'use client'

import React, { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import AddStock from '@/components/AddStock'
import WatchlistTable from '@/components/WatchlistTable'
import { getUserWatchlist } from '@/lib/actions/watchlist.actions'

type Company = {
    _id: string
    symbol: string
    favourite?: boolean
    userId: string
    companyId: string
    addedAt: Date
}

const Home = () => {
    const [watchlist, setWatchlist] = useState<Company[]>([])
    const [loading, setLoading] = useState(true)

    // Load watchlist from database
    const loadWatchlist = async () => {
        setLoading(true)
        try {
            const data = await getUserWatchlist()
            setWatchlist(data)
        } catch (error) {
            console.error('Error loading watchlist:', error)
        } finally {
            setLoading(false)
        }
    }

    // Load watchlist when page loads
    useEffect(() => {
        loadWatchlist()
    }, [])

    // Reload watchlist when stock is added or removed
    const handleUpdate = () => {
        loadWatchlist()
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <p className="text-gray-400">Loading...</p>
            </div>
        )
    }

    // Empty state
    if (watchlist.length === 0) {
        return (
            <section className="flex watchlist-empty-container">
                <div className="watchlist-empty">
                    <Star className="watchlist-star" />
                    <h2 className="empty-title">Your watchlist is empty</h2>
                    <p className="empty-description">
                        Start building your watchlist by adding Thai stock symbols.
                    </p>
                </div>
                <AddStock onAdded={handleUpdate} />
            </section>
        )
    }

    // Watchlist with data
    return (
        <section className="watchlist">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h2 className="watchlist-title">My Watchlist</h2>
                    <AddStock onAdded={handleUpdate} />
                </div>
                <WatchlistTable companies={watchlist} onRemove={handleUpdate} onFavourite={handleUpdate} />
            </div>
        </section>
    )
}

export default Home
