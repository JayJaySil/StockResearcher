// Server actions for CRUD on the user's watchlist.
'use server'

import { connectToDatabase } from '@/database/mongoose';
import {auth} from "@/lib/better-auth/auth";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {Company} from "@/database/models/company.model";
import {isValidStockSymbol} from "@/lib/actions/setsmart.actions";
import {ObjectId} from "mongodb";

// Add stock to watchlist
// Add a symbol to the authenticated user's watchlist.
export const addToWatchlist = async (symbol: string) => {
    try {
        await connectToDatabase()

        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if (!session?.user) redirect('/sign-in');

        // Check if stock already exists in watchlist
        const existingItem = await Company.findOne({
            userId: session.user.id,
            symbol: symbol.toUpperCase(),
        });

        if (existingItem) {
            return { success: false, error: 'Stock already in watchlist' };
        }

        //Check if symbol exists in SETSMART
        const checkSymbol = await isValidStockSymbol(symbol);

        if (!checkSymbol) {
            return { success: false, error: 'Invalid stock symbol' };
        }

        const id = new ObjectId();

        // Add to watchlist
        const newCompany = new Company({
            userId: session.user.id,
            companyId: id.toString(),
            symbol: symbol.toUpperCase(),
        });

        await newCompany.save();
        revalidatePath('/watchlist');

        return { success: true, message: 'Stock added to watchlist' };
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        return { success: false, error: 'Failed to add stock to watchlist' };
    }
};

// Remove stock from watchlist
// Remove a symbol from the authenticated user's watchlist.
export const removeFromWatchlist = async (symbol: string) => {
    try {
        await connectToDatabase()

        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if (!session?.user) redirect('/sign-in');

        // Remove from watchlist
        await Company.deleteOne({
            userId: session.user.id,
            symbol: symbol.toUpperCase(),
        });
        revalidatePath('/watchlist');

        return { success: true, message: 'Stock removed from watchlist' };
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        return { success: false, error: 'Failed to remove stock from watchlist' };
    }
};

// Fetch the authenticated user's watchlist as plain JSON objects.
export const getUserWatchlist = async () => {
    try {
        await connectToDatabase()

        const session = await auth.api.getSession({
            headers: await headers(),
        });
        if (!session?.user) redirect('/sign-in');

        const watchlist = await Company.find({ userId: session.user.id })
        .sort({ addedAt: -1 })
        .lean();

        return JSON.parse(JSON.stringify(watchlist));

    } catch (error) {
        console.error('Error fetching watchlist:', error);
        return [];
    }
};
