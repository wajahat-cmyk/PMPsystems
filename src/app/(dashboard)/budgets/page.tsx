'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/dashboard/metric-card';
import { BudgetPacing } from '@/components/dashboard/budget-pacing';
import { useCampaigns } from '@/hooks/use-campaigns';
import { DollarSign, Wallet, AlertTriangle, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils/formatters';

export default function BudgetsPage() {
  const { data: campaigns, isLoading } = useCampaigns();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
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
      </div>
    );
  }

  const data = campaigns ?? [];
  const activeCampaigns = data.filter((c) => c.state === 'enabled');

  // Budget calculations
  const totalDailyBudget = activeCampaigns.reduce(
    (sum, c) => sum + c.dailyBudget,
    0
  );
  const totalSpentToday = activeCampaigns.reduce(
    (sum, c) => sum + (c.latest?.cost ?? 0),
    0
  );
  const totalMonthlyBudget = totalDailyBudget * 30;
  const totalMonthlySpend = data.reduce(
    (sum, c) => sum + c.thirtyDay.cost,
    0
  );
  const overPacingCount = activeCampaigns.filter((c) => {
    const pacing =
      c.dailyBudget > 0 ? ((c.latest?.cost ?? 0) / c.dailyBudget) * 100 : 0;
    const hourOfDay = new Date().getHours();
    const expectedPace = (hourOfDay / 24) * 100;
    return pacing > expectedPace + 15;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Budget Tracking</h1>
        <p className="text-muted-foreground">
          Monitor your daily and monthly spending across all campaigns
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Daily Budget"
          value={totalDailyBudget}
          icon={Wallet}
          format="currency"
        />
        <MetricCard
          title="Spent Today"
          value={totalSpentToday}
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="Monthly Spend (30d)"
          value={totalMonthlySpend}
          icon={TrendingUp}
          format="currency"
        />
        <MetricCard
          title="Over-Pacing Campaigns"
          value={overPacingCount}
          icon={AlertTriangle}
          format="number"
        />
      </div>

      {/* Monthly Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Budget Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Est. Monthly Budget
                </span>
                <span className="font-medium">
                  {formatCurrency(totalMonthlyBudget)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Actual Monthly Spend (30d)
                </span>
                <span className="font-medium">
                  {formatCurrency(totalMonthlySpend)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-sm font-medium">Budget Utilization</span>
                <span className="font-bold">
                  {totalMonthlyBudget > 0
                    ? formatPercentage(
                        (totalMonthlySpend / totalMonthlyBudget) * 100
                      )
                    : '0%'}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Campaigns
                </span>
                <span className="font-medium">{activeCampaigns.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Avg Daily Spend
                </span>
                <span className="font-medium">
                  {formatCurrency(totalMonthlySpend / 30)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-sm font-medium">
                  Projected Monthly Spend
                </span>
                <span className="font-bold">
                  {formatCurrency((totalMonthlySpend / 30) * 30)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Campaign Budget Pacing */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Campaign Budget Pacing (Today)
        </h2>
        {activeCampaigns.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeCampaigns.map((campaign) => (
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
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No active campaigns to display budget pacing
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
