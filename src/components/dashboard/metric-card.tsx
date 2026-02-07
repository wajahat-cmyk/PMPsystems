'use client';

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatMetricValue } from '@/lib/utils/formatters';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  format?: 'currency' | 'percentage' | 'number' | 'compact';
  invertTrend?: boolean; // For ACOS where lower is better
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  format = 'number',
  invertTrend = false,
}: MetricCardProps) {
  const formattedValue = formatMetricValue(value, format);

  let trend: 'up' | 'down' | 'neutral' = 'neutral';
  if (change !== undefined) {
    if (change > 0) trend = invertTrend ? 'down' : 'up';
    else if (change < 0) trend = invertTrend ? 'up' : 'down';
  }

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs mt-1',
              trend === 'up' && 'text-green-600',
              trend === 'down' && 'text-red-600',
              trend === 'neutral' && 'text-muted-foreground'
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}% from last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
