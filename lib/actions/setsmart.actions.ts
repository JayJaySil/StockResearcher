'use server'

import { formatDate } from '../utils';

// Checks if a given SET/SETTRADE stock code appears valid by querying the SETSMART EOD endpoint.
export const isValidStockSymbol = async (symbol: string): Promise<boolean> => {
  try {
    if (!symbol) return false;
    const sym = symbol.trim().toUpperCase();

    // Allow letters (A–Z), digits (0–9), and dash (e.g., ABC-W1); enforce 1–8 chars to match common SET tickers
    // if (!/^[A-Z0-9-]{1,8}$/.test(sym)) return false;

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

//Return SETSMART most recent basic Stock Info
export const getBasicStockInfo = async (symbol: string): Promise<any> => {
  const apiKey = process.env.SETSMART_API_KEY;
  if (!apiKey) {
    console.error('SETSMART_API_KEY is not set in environment');
    return { success: false, error: 'SETSMART_API_KEY is not set in environment' };
  }

  const sym = (symbol || '').trim().toUpperCase();
  if (!sym) return { success: false, error: 'Symbol is required' };

  // Build date range: start = today, end = today - 20
  const today = new Date();
  const startDate = formatDate(today);
  const endDateObj = new Date(today);
  endDateObj.setDate(today.getDate() - 20);
  const endDate = formatDate(endDateObj);

  try {
    const url = new URL('https://www.setsmart.com/api/listed-company-api/eod-price-by-symbol');
    url.searchParams.set('symbol', sym);
    url.searchParams.set('startDate', startDate);
    url.searchParams.set('endDate', endDate);
    url.searchParams.set('adjustedPriceFlag', 'N');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'api-key': apiKey },
      cache: 'no-store',
    });

    if (!res.ok) {
      return { success: false, error: `SETSMART response ${res.status}` };
    }

    let json: any;
    try {
      json = await res.json();
    } catch {
      return { success: false, error: 'Invalid JSON from SETSMART' };
    }

    // Normalize to array and return the last (most recent) entry 
    let arr: any[] = [];
    if (Array.isArray(json)) {
      arr = json;
    } else if (json && typeof json === 'object' && Array.isArray((json as any).data)) {
      arr = (json as any).data;
    }

    if (arr.length === 0) {
      return { success: false, error: 'No data in last 20 days' };
    }
    console.log(arr)
    return arr[arr.length - 1];
  } catch (error) {
    console.error('Error getting SETSMART basic stock info:', error);
    return { success: false, error: 'Failed to get basic stock info' };
  }
}
