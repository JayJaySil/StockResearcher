import { NextResponse } from 'next/server';
import { isValidStockSymbol } from '@/lib/actions/setsmart.actions';

// GET /api/validate-symbol?symbol=ABC
// Returns { symbol: 'ABC', valid: boolean }.
// Note: The validator queries recent EOD data; false may mean no recent trades or an invalid code.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') || '').trim();

  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol query parameter' }, { status: 400 });
  }

  const valid = await isValidStockSymbol(symbol);
  return NextResponse.json({ symbol: symbol.toUpperCase(), valid });
}

// POST /api/validate-symbol
// Body: { "symbol": "ABC" }
// Returns { symbol: 'ABC', valid: boolean } or 400 on bad input.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbol = (body?.symbol || '').trim();

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol in request body' }, { status: 400 });
    }

    const result = await isValidStockSymbol(symbol);
    return NextResponse.json({ symbol: symbol.toUpperCase(), ...result });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
