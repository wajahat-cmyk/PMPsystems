'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/dashboard/metric-card';
import { RootIndexTable } from '@/components/dashboard/root-index-table';
import { useRootIndex } from '@/hooks/use-root-index';
import { usePortfolioFilter } from '@/components/providers/portfolio-filter-provider';
import { Layers, DollarSign, TrendingUp, Target } from 'lucide-react';

export default function RootIndexPage() {
  const [days, setDays] = useState(30);
  const { selectedPortfolio } = usePortfolioFilter();

  const { data: roots, isLoading } = useRootIndex({
    days,
    portfolio: selectedPortfolio || undefined,
  });

  const data = roots ?? [];

  const totalSpend = data.reduce((sum, r) => sum + r.metrics.cost, 0);
  const totalSales = data.reduce((sum, r) => sum + r.metrics.sales, 0);
  const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Root Index</h1>
        <p className="text-muted-foreground">
          Analyze performance grouped by root keyword patterns
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select
                value={String(days)}
                onValueChange={(v) => setDays(parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Total Roots"
            value={data.length}
            icon={Layers}
            format="number"
          />
          <MetricCard
            title="Total Spend"
            value={totalSpend}
            icon={DollarSign}
            format="currency"
          />
          <MetricCard
            title="Total Sales"
            value={totalSales}
            icon={TrendingUp}
            format="currency"
          />
          <MetricCard
            title="Blended ACOS"
            value={avgAcos}
            icon={Target}
            format="percentage"
            invertTrend
          />
        </div>
      )}

      {/* Root Index Table */}
      <RootIndexTable roots={data} loading={isLoading} />
    </div>
  );
}
