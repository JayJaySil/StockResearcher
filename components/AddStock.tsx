//Dialog component to add a stock to the user's watchlist

//https://ui.shadcn.com/docs/components/dialog
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { addToWatchlist } from '@/lib/actions/watchlist.actions'

type AddStockProps = {
    onAdded?: (company: { symbol: string }) => void
}

const AddStock = ({ onAdded }: AddStockProps) => {
    const [open, setOpen] = useState(false)
    const [symbol, setSymbol] = useState('')
    const [loading, setLoading] = useState(false)

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Convert to uppercase and remove spaces
        const cleanSymbol = symbol.trim().toUpperCase()
        
        if (!cleanSymbol) {
            toast.error('Please enter a stock symbol')
            return
        }
        
        setLoading(true)
        
        try {
            const result = await addToWatchlist(cleanSymbol)
            
            if (result.success) {
                toast.success(`Added ${cleanSymbol} to watchlist`)
                setSymbol('')
                setOpen(false)
                onAdded?.({ symbol: cleanSymbol })
            } else {
                toast.error(result.error || 'Failed to add stock')
            }
        } catch (error) {
            console.error('Error in form:', error)
            toast.error('Something went wrong. Check console for details.')
        } finally {
            setLoading(false)
        }
    }



    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="yellow-btn">
                    <Plus className="h-4 w-4" />
                    Add Stock
                </Button>
            </DialogTrigger>
            <DialogContent className="alert-dialog sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="alert-title">Add Stock to Watchlist</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Enter a stock symbol from the Thai stock market
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="stock-symbol" className="form-label">
                            Stock Symbol
                        </Label>
                        <Input
                            id="stock-symbol"
                            type="text"
                            placeholder="e.g. PTT, AOT, KBANK"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            disabled={loading}
                            className="form-input"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !symbol.trim()}
                            className="yellow-btn min-w-[100px]"
                        >
                            {loading ? 'Adding...' : 'Add Stock'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default AddStock
