import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind class names conditionally and deduplicate conflicting utilities.
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Format a Date to YYYY-MM-DD (UTC unaffected by local TZ offset).
export const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Convert a seconds-since-epoch timestamp to a human "time ago" string.
export const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diffInMs = now - timestamp * 1000; // Convert to milliseconds
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInHours > 24) {
        const days = Math.floor(diffInHours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInHours >= 1) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
};

// Simple async sleep helper.
export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Formatted string like "$3.10T", "$900.00B", "$25.00M" or "$999,999.99"
// Format large numbers into compact units:
//  - >= 1e12 -> T, >= 1e9 -> B, >= 1e6 -> M, else 2 decimals.
export function formatLargeNum(number: number): string {
    if (!Number.isFinite(number)) return 'N/A';

    if (number === 0) return '0.00';

    const sign = number < 0 ? '-' : '';
    const n = Math.abs(number);

    if (n >= 1e12) return `${sign}${(n / 1e12).toFixed(2)}T`; // Trillions
    if (n >= 1e9) return `${sign}${(n / 1e9).toFixed(2)}B`; // Billions
    if (n >= 1e6) return `${sign}${(n / 1e6).toFixed(2)}M`; // Millions
    return `${sign}${n.toFixed(2)}`; // Below one million, show full amount
}

// Return an object with ISO date strings { from, to } covering the last N days.
export const getDateRange = (days: number) => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - days);
    return {
        to: toDate.toISOString().split('T')[0],
        from: fromDate.toISOString().split('T')[0],
    };
};

// Get today's date range (from today to today)
// Today's date range as { from: YYYY-MM-DD, to: YYYY-MM-DD }.
export const getTodayDateRange = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    return {
        to: todayString,
        from: todayString,
    };
};

// Calculate news per symbol based on watchlist size
// Decide how many news items per symbol to show, targeting ~6 total.
export const calculateNewsDistribution = (symbolsCount: number) => {
    let itemsPerSymbol: number;
    let targetNewsCount = 6;

    if (symbolsCount < 3) {
        itemsPerSymbol = 3; // Fewer symbols, more news each
    } else if (symbolsCount === 3) {
        itemsPerSymbol = 2; // Exactly 3 symbols, 2 news each = 6 total
    } else {
        itemsPerSymbol = 1; // Many symbols, 1 news each
        targetNewsCount = 6; // Don't exceed 6 total
    }

    return { itemsPerSymbol, targetNewsCount };
};

// Check for required article fields
// Basic sanity check for a raw news article.
export const validateArticle = (article: RawNewsArticle) =>
    article.headline && article.summary && article.url && article.datetime;

// Get today's date string in YYYY-MM-DD format
// Today's date as YYYY-MM-DD (UTC).
export const getTodayString = () => new Date().toISOString().split('T')[0];

// Normalize a raw news article into the UI shape used by cards/lists.
export const formatArticle = (
    article: RawNewsArticle,
    isCompanyNews: boolean,
    symbol?: string,
    index: number = 0
) => ({
    id: isCompanyNews ? Date.now() + Math.random() : article.id + index,
    headline: article.headline!.trim(),
    summary:
        article.summary!.trim().substring(0, isCompanyNews ? 200 : 150) + '...',
    source: article.source || (isCompanyNews ? 'Company News' : 'Market News'),
    url: article.url!,
    datetime: article.datetime!,
    image: article.image || '',
    category: isCompanyNews ? 'company' : article.category || 'general',
    related: isCompanyNews ? symbol! : article.related || '',
});

// Render a +/- percentage with two decimals and sign.
export const formatChangePercent = (changePercent?: number) => {
    if (!changePercent) return '';
    const sign = changePercent > 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
};

// Tailwind color class for up/down/neutral changes.
export const getChangeColorClass = (changePercent?: number) => {
    if (!changePercent) return 'text-gray-400';
    return changePercent > 0 ? 'text-green-500' : 'text-red-500';
};

// Format a price with 2 decimal places (en-US).
export const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
    }).format(price);
};

export const formatDateToday = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
});


// Human-friendly alert string, e.g. "Price > 12.34".
export const getAlertText = (alert: Alert) => {
    const condition = alert.alertType === 'upper' ? '>' : '<';
    return `Price ${condition} ${formatPrice(alert.threshold)}`;
};

// Human-readable date string for today (en-US, UTC).
export const getFormattedTodayDate = () => new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
});
