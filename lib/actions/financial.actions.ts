// Server actions for financial information
'use server'

// Get financial data by symbol from the SETSMART API.
export const getFinancials = async (symbol: string): Promise<SETSMARTFinancials[]> => {
  const apiKey = process.env.SETSMART_API_KEY;
  if (!apiKey) {
    console.error('SETSMART_API_KEY is not set in environment');
    throw new Error('SETSMART_API_KEY is not set in environment');
  }

  const sym = (symbol || '').trim().toUpperCase();
  if (!sym) throw new Error('Symbol is required');

  //Get year and quarter range
  const now = new Date();
  const endYear = now.getFullYear();
  const endQuarter = Math.floor((now.getMonth() + 3) / 3) //Most recent quarter
  const startYear = endYear - 5;
  const startQuarter = 1;

  //Call SETSMART API
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

// Take quarterly records to only one record per year which is the latest quarter
export const toYearlyBase = async (rawData: SETSMARTFinancials[]) => {
  const latestByYear: { [year: string]: SETSMARTFinancials } = {};

  for (const item of rawData) {
    const year = String(item.year);
    const quarter = Number(item.quarter);

    // If we dont have a record for this year yet, or this quarter is greater, replace it with the current record
    if (!(year in latestByYear) || quarter > Number(latestByYear[year].quarter)) {
      latestByYear[year] = item;
    }
  }

  //latestByYear is an object with year keys that only stores the latest quarter data for each year

  // Convert to array of SETSMARTFinancials objects
  const yearData = Object.values(latestByYear);

  //Define the keys and labels for the financial table metrics we want
  const metrics = [
    { key: 'totalAssets', label: 'Total Assets (THB thousands)' },
    { key: 'totalLiabilities', label: 'Total Liabilities (THB thousands)' },
    { key: 'shareholderEquity', label: 'Shareholder Equity (THB thousands)' },
    { key: 'paidupShareCapital', label: 'Paid-up Share Capital (THB thousands)' },
    { key: 'totalRevenueAccum', label: 'Total Revenue (THB thousands)' },
    { key: 'ebitAccum', label: 'EBIT (THB thousands)' },
    { key: 'netProfitAccum', label: 'Net Profit (THB thousands)' },
    { key: 'epsAccum', label: 'EPS (THB thousands)' },
    { key: 'operatingCashFlow', label: 'Operating Cash Flow (THB thousands)' },
    { key: 'investingCashFlow', label: 'Investing Cash Flow (THB thousands)' },
    { key: 'financingCashFlow', label: 'Financing Cash Flow (THB thousands)' },
  ];

  const result = [];

  //Takes the array of objects to a displayable format
  for (const metricDefinition of metrics) {
    const metricRow: Record<string, unknown> = { metric: metricDefinition.label, key: metricDefinition.key };

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
