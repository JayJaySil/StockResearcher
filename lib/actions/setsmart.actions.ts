// Server-side helpers for validating symbols against SETSMART.
'use server'

// Checks if a given SET/SETTRADE stock code appears valid by querying the SETSMART EOD endpoint.
// Quick heuristic: verifies a ticker returns any data in a short date window.
// Avoids false positives by checking array/object shapes in the response.
export const isValidStockSymbol = async (symbol: string): Promise<boolean> => {
  try {
    if (!symbol) return false;
    const sym = symbol.trim().toUpperCase();

    // Allow letters (A–Z), digits (0–9), and dash (e.g., ABC-W1); enforce 1–8 chars to match common SET tickers
    if (!/^[A-Z0-9-]{1,8}$/.test(sym)) return false;

    const apiKey = process.env.SETSMART_API_KEY;
    if (!apiKey) {
        console.error('SETSMART_API_KEY is not set in environment');
        return false;
    }

    const url = new URL('https://www.setsmart.com/api/listed-company-api/eod-price-by-symbol');
    url.searchParams.set('symbol', sym);
    url.searchParams.set('startDate', '2024-10-01');
    url.searchParams.set('endDate', '2024-10-30');
    url.searchParams.set('adjustedPriceFlag', 'N');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'api-key': apiKey },
      cache: 'no-store',
    });

    //if response return value not 200-299, return false
    if (!res.ok) return false;

    //get data from response
    let data: any;
    try {
      data = await res.json();
    } catch {
      return false;
    }

    //if no data, return false
    if (data == null) return false;

    //If data is an array, check if it's not empty
    if (Array.isArray(data)) return data.length > 0;
    if (Array.isArray((data as any)?.data)) return (data as any).data.length > 0;

    //If data is an object, check if it's not empty
    if (typeof data === 'object') return Object.keys(data as any).length > 0;

    return false;
  } catch (error) {
    console.error('Error checking SET/SETTRADE symbol:', error);
    return false;
  }
}
