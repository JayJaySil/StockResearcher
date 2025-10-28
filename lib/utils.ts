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

// Convert a seconds since timestamp to a human "time ago" string.
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

// Format a price with 2 decimal places (en-US).
export const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
    }).format(price);
};
