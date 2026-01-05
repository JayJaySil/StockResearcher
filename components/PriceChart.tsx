'use client'
// Render a selectable range price history chart.
// https://ui.shadcn.com/docs/components/table

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getPriceData } from '@/lib/actions/dashboard.actions';

type RangeKey = '1Y' | '3Y' | '5Y';

interface PricePoint {
  date: string;   // ISO string
  price: number;
}

interface PriceChartProps {
  symbol: string;
}

// Get the start to end range from the selections (1Y, 3Y, 5Y).
function rangeToStart(end: Date, r: RangeKey) {
  const years = { '1Y': 1, '3Y': 3, '5Y': 5}[r];
  const d = new Date(end);
  d.setFullYear(end.getFullYear() - years);
  return d;
}

const PriceChart = ({symbol}: PriceChartProps) => {
  const [range, setRange] = useState<RangeKey>('1Y');
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const end = new Date();
    const start = rangeToStart(end, range);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    let isGone = false;
    setLoading(true);

    const fetchData = async () => {
      try {
        const rows: unknown = await getPriceData(symbol, startStr, endStr);
        if (isGone) return;
        // Allow for an array of prices
        setData(Array.isArray(rows) ? (rows as PricePoint[]) : []);
      } catch (_error) {
        if (isGone) return;
        setData([]);
      } finally {
        if (isGone) return;
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      isGone = true;
    };
  }, [symbol, range]);

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {(['1Y','3Y','5Y'] as RangeKey[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-md text-white border border-black cursor-pointer ${r === range ? 'bg-yellow-400' : 'bg-gray-500'}`}
          >
            {r}
          </button>
        ))}
        {loading ? <span className="text-xs text-muted-foreground">Loading...</span> : null}
      </div>
      <div className="w-full pt-3">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="date" tickMargin={8} />
            <YAxis dataKey="price" width={60} />
            <Tooltip />
            <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PriceChart
