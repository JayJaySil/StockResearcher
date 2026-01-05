'use client'
// Display user watchlist companies

import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { removeFromWatchlist, toggleFavourite } from '@/lib/actions/watchlist.actions'
import { useRouter } from 'next/navigation'

// Type props for companies
type Company = {
    _id: string
    symbol: string
    favourite?: boolean
    userId: string
    companyId: string
    addedAt: Date
}

type WatchlistTableProps = {
    companies: Company[]
    onRemove?: () => void
    onFavourite?: () => void
}

const WatchlistTable = ({ companies, onRemove, onFavourite }: WatchlistTableProps) => {
    const [removing, setRemoving] = useState<string | null>(null)
    const [favouriting, setFavouriting] = useState<string | null>(null)
    const router = useRouter()

    // Go to company dashboard when click passing synbol and companyId through parameters
    const handleRowClick = (company: Company) => {
        router.push(`/dashboard?symbol=${company.symbol}&companyId=${company.companyId}`)
    }

    const handleRemove = async (symbol: string, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent row click when removing
        setRemoving(symbol)
        
        try {
            const result = await removeFromWatchlist(symbol)
            
            if (result.success) {
                toast.success(`Removed ${symbol} from watchlist`)
                onRemove?.()
            } else {
                toast.error(result.error || 'Failed to remove stock')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setRemoving(null)
        }
    }

    const handleFavouriteToggle = async (symbol: string, e: React.MouseEvent) => {
        e.stopPropagation() // Stop row click when selecting favourite
        setFavouriting(symbol)

        try {
            const result = await toggleFavourite(symbol)

            if (result.success) {
                // Refresh watchlist
                onFavourite?.()
            } else {
                toast.error(result.error || 'Failed to update favourite')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setFavouriting(null)
        }
    }

    if (companies.length === 0) {
        // Empty state when the user has no saved companies yet.
        return (
            <div className="text-center py-10 text-gray-500">
                <p>No stocks in your watchlist yet.</p>
                <p className="text-sm mt-2">Click "Add Stock" to get started!</p>
            </div>
        )
    }

    return (
        <div className="watchlist-table">
            <Table>
                <TableBody>
                    {companies.map((company) => (
                        <TableRow 
                            key={company._id} 
                            className="table-row cursor-pointer"
                            onClick={() => handleRowClick(company)}
                        >
                            <TableCell className="w-12">
                                <button
                                    type="button"
                                    onClick={(e) => handleFavouriteToggle(company.symbol, e)}
                                    disabled={favouriting === company.symbol}
                                    aria-label={`Toggle favourite for ${company.symbol}`}
                                >
                                    <Star 
                                        className={`h-5 w-5 ${company.favourite ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`}
                                    />
                                </button>
                            </TableCell>
                            <TableCell className="font-medium text-gray-100">
                                {company.symbol}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleRemove(company.symbol, e)}
                                    disabled={removing === company.symbol}
                                    className="text-gray-400 hover:text-red-400"
                                >
                                    {removing === company.symbol ? (
                                        'Removing...'
                                    ) : (
                                        <>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove Company
                                        </>
                                    )}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default WatchlistTable
