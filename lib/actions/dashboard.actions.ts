// Server actions for dashboard data: basic stock info and chart price series.
'use server'

//Return SETSMART most recent basic Stock Info
// Fetch the most recent EOD quote for a symbol from SETSMART.
export const getBasicStockInfo = async (symbol: string): Promise<SETSMARTStockQuote> => {
  const apiKey = process.env.SETSMART_API_KEY;
  if (!apiKey) {
    console.error('SETSMART_API_KEY is not set in environment');
    throw new Error('SETSMART_API_KEY is not set in environment');
  }

  const sym = (symbol || '').trim().toUpperCase();
  if (!sym) throw new Error('Symbol is required');

  // Build date range: start = today, end = today - 20
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);
  const startDateObj = new Date(today);
  startDateObj.setDate(today.getDate() - 20);
  const startDate = startDateObj.toISOString().slice(0, 10);

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
      throw new Error(`SETSMART response ${res.status}`);
    }

    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new Error('Invalid JSON from SETSMART');
    }

    if (json.length === 0) {
      throw new Error('No data in last 20 days');
    }

    return json[json.length - 1];
  } catch (error) {
    console.error('Error getting SETSMART basic stock info:', error);
    throw new Error('Failed to get basic stock info');
  }
}

// Fetch a date range of EOD prices and normalize to { date, price }[]
export const getPriceData = async (symbol: string, startDate: string, endDate: string) => {
  try {
    const apiKey = process.env.SETSMART_API_KEY;
    if (!apiKey) {
      console.error('No SETSMART_API_KEY');
      return [];
    }

    const sym = (symbol || '').trim().toUpperCase();
    if (!sym) return [];

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
      console.error('SETSMART error', res.status);
      return [];
    }

    const json: any = await res.json();
    const rows: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

    return rows
      .map((r: any) => ({
        date: (r.date || r.tradeDate || r.eodDate || r.D || r.d || r.t || ''),
        price: Number(r.close ?? r.closePrice ?? r.C ?? r.c ?? r.price ?? NaN),
      }))
      .filter((p: any) => p.date && Number.isFinite(p.price));
  } catch (err) {
    console.error('getPriceData failed', err);
    return [];
  }
}
