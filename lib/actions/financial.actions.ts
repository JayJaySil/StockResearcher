// Server actions for financial statements and formatting helpers.
'use server'

// Get raw financial + ratio data by symbol from SETSMART.
export const getFinancials = async (symbol: string): Promise<SETSMARTFinancials[]> => {
  const apiKey = process.env.SETSMART_API_KEY;
  if (!apiKey) {
    console.error('SETSMART_API_KEY is not set in environment');
    throw new Error('SETSMART_API_KEY is not set in environment');
  }

  const sym = (symbol || '').trim().toUpperCase();
  if (!sym) throw new Error('Symbol is required');

  //Get year/quarter range
  const now = new Date();
  const endYear = now.getFullYear();
  const endQuarter = Math.floor((now.getMonth() + 3) / 3) //Most recent quarter
  const startYear = endYear - 5;
  const startQuarter = 1;

  try {
    const url = new URL('https://www.setsmart.com/api/listed-company-api/financial-data-and-ratio-by-symbol');
    url.searchParams.set('symbol', sym);
    url.searchParams.set('startYear', String(startYear));
    url.searchParams.set('endYear', String(endYear));
    url.searchParams.set('startQuarter', String(startQuarter));
    url.searchParams.set('endQuarter', String(endQuarter));

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'api-key': apiKey },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`SETSMART response ${res.status}`);
    }

    let json: SETSMARTFinancials[];
    try {
      json = await res.json();
    } catch {
      throw new Error('Invalid JSON from SETSMART');
    }

    if (json.length === 0) {
      throw new Error('No data found');
    }

    return json;
  } catch (error) {
    console.error('Error getting SETSMART basic stock info:', error);
    throw new Error('Failed to get basic stock info');
  }
}

// Reduce quartered records to one record per year (latest quarter).
export const toYearlyBase = async (rawData: SETSMARTFinancials[]) => {
  const latestByYear: { [year: string]: SETSMARTFinancials } = {};

  for (const item of rawData) {
    const year = String(item.year);
    const quarter = Number(item.quarter);

    // If we don’t have a record for this year yet, or this quarter is greater → replace
    if (!(year in latestByYear) || quarter > Number(latestByYear[year].quarter)) {
      latestByYear[year] = item;
    }
  }

  //latestByYear is an object with year keys that only stores the latest quarter data for each year

  // Convert to array of SETSMARTFinancials
  const yearData = Object.values(latestByYear);

  const metrics = [
    { key: 'totalAssets', label: 'Total Assets' },
    { key: 'totalLiabilities', label: 'Total Liabilities' },
    { key: 'shareholderEquity', label: 'Shareholder Equity' },
    { key: 'paidupShareCapital', label: 'Paid-up Share Capital' },
    { key: 'totalRevenueAccum', label: 'Total Revenue (Accum)' },
    { key: 'ebitAccum', label: 'EBIT (Accum)' },
    { key: 'netProfitAccum', label: 'Net Profit (Accum)' },
    { key: 'epsAccum', label: 'EPS (Accum)' },
    { key: 'operatingCashFlow', label: 'Operating Cash Flow' },
    { key: 'investingCashFlow', label: 'Investing Cash Flow' },
    { key: 'financingCashFlow', label: 'Financing Cash Flow' },
    { key: 'roe', label: 'ROE' },
    { key: 'roa', label: 'ROA' },
    { key: 'netProfitMarginAccum', label: 'Net Profit Margin (Accum)' },
    { key: 'de', label: 'Debt to Equity (D/E)' },
    { key: 'fixedAssetTurnover', label: 'Fixed Asset Turnover' },
    { key: 'totalAssetTurnover', label: 'Total Asset Turnover' }
  ];

  const result = [];

  //Transforms array of objects to a displayable format
  for (const metricDefinition of metrics) {
    const metricRow: Record<string, unknown> = { metric: metricDefinition.label };

    for (const yearlyRecord of yearData) {
      const yearKey = String(yearlyRecord.year);
      const metricValue = (yearlyRecord as any)[metricDefinition.key];
      if (metricValue != null) {
        metricRow[yearKey] = metricValue;
      }
    }

    result.push(metricRow);
  }

  return result;
}
