#!/usr/bin/env node

// Simple CLI to test the validate-symbol API route.
// Usage:
//   1) Start the dev server:  npm run dev
//   2) In another terminal:   node scripts/test-symbol.mjs ABC
// Notes:
//   - Set TEST_BASE_URL to point at a non-default server (e.g., http://localhost:4000).
//   - Exit codes: 0 = VALID, 3 = INVALID, 1 = request/runtime error, 2 = bad usage.

const symbol = (process.argv[2] || '').trim();
if (!symbol) {
  console.error('Usage: node scripts/test-symbol.mjs <SYMBOL>');
  process.exit(2);
}

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
const url = `${baseUrl}/api/validate-symbol?symbol=${encodeURIComponent(symbol)}`;

(async () => {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      console.error('Request failed:', res.status, res.statusText);
      const text = await res.text();
      console.error(text);
      process.exit(1);
    }
    const data = await res.json();
    const validText = data.valid ? 'VALID' : 'INVALID';
    console.log(`Symbol ${data.symbol}: ${validText}`);
    process.exit(data.valid ? 0 : 3);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
