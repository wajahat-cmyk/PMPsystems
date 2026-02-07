'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface MetricDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  sales: number;
}

interface CampaignPerformanceChartProps {
  data: MetricDataPoint[];
}

export function CampaignPerformanceChart({
  data,
}: CampaignPerformanceChartProps) {
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({
        date: format(new Date(item.date), 'MMM dd'),
        impressions: item.impressions,
        clicks: item.clicks,
        cost: item.cost,
        sales: item.sales,
      }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-muted-foreground">
        No performance data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tick={{ fontSize: 12 }}
        />
        <YAxis yAxisId="left" className="text-xs" tick={{ fontSize: 12 }} />
        <YAxis
          yAxisId="right"
          orientation="right"
          className="text-xs"
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="impressions"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={false}
          name="Impressions"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="clicks"
          stroke="#06b6d4"
          strokeWidth={2}
          dot={false}
          name="Clicks"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cost"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          name="Cost ($)"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="sales"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          name="Sales ($)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
