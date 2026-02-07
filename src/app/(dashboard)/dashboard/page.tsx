'use client';

import {
  DollarSign,
  TrendingUp,
  MousePointerClick,
  Eye,
  Target,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/dashboard/metric-card';
import { CampaignPerformanceChart } from '@/components/charts/campaign-performance-chart';
import { AcosTrendChart } from '@/components/charts/acos-trend-chart';
import { BudgetPacing } from '@/components/dashboard/budget-pacing';
import { CampaignTable } from '@/components/dashboard/campaign-table';
import { useCampaigns } from '@/hooks/use-campaigns';
import { usePortfolioFilter } from '@/components/providers/portfolio-filter-provider';
import { calculatePercentageChange } from '@/lib/utils/calculations';

export default function DashboardPage() {
  const { selectedPortfolio } = usePortfolioFilter();
  const { data: campaigns, isLoading, error } = useCampaigns(selectedPortfolio || undefined);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-red-600">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error instanceof Error ? error.message : 'Please check your Amazon connection'}
          </p>
        </div>
      </div>
    );
  }

  const data = campaigns ?? [];

  // Calculate aggregate metrics
  const totalSpend = data.reduce((sum, c) => sum + c.thirtyDay.cost, 0);
  const totalSales = data.reduce((sum, c) => sum + c.thirtyDay.sales, 0);
  const totalImpressions = data.reduce(
    (sum, c) => sum + c.thirtyDay.impressions,
    0
  );
  const totalClicks = data.reduce((sum, c) => sum + c.thirtyDay.clicks, 0);
  const totalOrders = data.reduce((sum, c) => sum + c.thirtyDay.orders, 0);
  const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const avgRoas = totalSpend > 0 ? totalSales / totalSpend : 0;

  // Combine all metrics history for charts
  const combinedMetrics = new Map<
    string,
    { impressions: number; clicks: number; cost: number; sales: number; acos: number; roas: number }
  >();

  for (const campaign of data) {
    for (const metric of campaign.metricsHistory) {
      const existing = combinedMetrics.get(metric.date) ?? {
        impressions: 0,
        clicks: 0,
        cost: 0,
        sales: 0,
        acos: 0,
        roas: 0,
      };
      existing.impressions += metric.impressions;
      existing.clicks += metric.clicks;
      existing.cost += metric.cost;
      existing.sales += metric.sales;
      combinedMetrics.set(metric.date, existing);
    }
  }

  // Recalculate ACOS/ROAS for combined data
  const timeSeriesData = Array.from(combinedMetrics.entries()).map(
    ([date, m]) => ({
      date,
      impressions: m.impressions,
      clicks: m.clicks,
      cost: m.cost,
      sales: m.sales,
      acos: m.sales > 0 ? (m.cost / m.sales) * 100 : 0,
      roas: m.cost > 0 ? m.sales / m.cost : 0,
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your campaign performance (last 30 days)
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          title="Avg ACOS"
          value={avgAcos}
          icon={Target}
          format="percentage"
          invertTrend
        />
        <MetricCard
          title="Avg ROAS"
          value={avgRoas}
          icon={ShoppingCart}
          format="number"
        />
        <MetricCard
          title="Impressions"
          value={totalImpressions}
          icon={Eye}
          format="compact"
        />
        <MetricCard
          title="Clicks"
          value={totalClicks}
          icon={MousePointerClick}
          format="compact"
        />
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignPerformanceChart data={timeSeriesData} />
        </CardContent>
      </Card>

      {/* ACOS/ROAS Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>ACOS & ROAS Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <AcosTrendChart
            data={timeSeriesData}
            targetAcos={25}
            targetRoas={4}
          />
        </CardContent>
      </Card>

      {/* Budget Pacing */}
      {data.filter((c) => c.state === 'enabled').length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Budget Pacing</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data
              .filter((c) => c.state === 'enabled')
              .slice(0, 6)
              .map((campaign) => (
                <BudgetPacing
                  key={campaign.id}
                  campaignName={campaign.name}
                  dailyBudget={campaign.dailyBudget}
                  spentToday={campaign.latest?.cost ?? 0}
                  pacePercentage={
                    campaign.dailyBudget > 0
                      ? ((campaign.latest?.cost ?? 0) / campaign.dailyBudget) *
                        100
                      : 0
                  }
                  hourOfDay={new Date().getHours()}
                />
              ))}
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignTable campaigns={data} />
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
