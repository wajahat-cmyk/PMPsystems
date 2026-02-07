'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';

interface AcosDataPoint {
  date: string;
  acos: number;
  roas: number;
  sales: number;
}

interface AcosTrendChartProps {
  data: AcosDataPoint[];
  targetAcos?: number;
  targetRoas?: number;
}

export function AcosTrendChart({
  data,
  targetAcos,
  targetRoas,
}: AcosTrendChartProps) {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({
        date: format(new Date(item.date), 'MMM dd'),
        acos: Number(item.acos.toFixed(2)),
        roas: Number(item.roas.toFixed(2)),
        sales: item.sales,
      }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground">
        No ACOS/ROAS data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
        <YAxis
          yAxisId="left"
          className="text-xs"
          tick={{ fontSize: 12 }}
          label={{
            value: 'ACOS (%)',
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 12 },
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          className="text-xs"
          tick={{ fontSize: 12 }}
          label={{
            value: 'ROAS',
            angle: 90,
            position: 'insideRight',
            style: { fontSize: 12 },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />

        {targetAcos && (
          <ReferenceLine
            yAxisId="left"
            y={targetAcos}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{
              value: `Target ACOS (${targetAcos}%)`,
              position: 'right',
              style: { fontSize: 11, fill: '#ef4444' },
            }}
          />
        )}

        {targetRoas && (
          <ReferenceLine
            yAxisId="right"
            y={targetRoas}
            stroke="#22c55e"
            strokeDasharray="5 5"
            label={{
              value: `Target ROAS (${targetRoas})`,
              position: 'right',
              style: { fontSize: 11, fill: '#22c55e' },
            }}
          />
        )}

        <Bar
          yAxisId="left"
          dataKey="acos"
          fill="#f97316"
          opacity={0.7}
          name="ACOS (%)"
          radius={[2, 2, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="roas"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="ROAS"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
