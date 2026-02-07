'use client';

import { use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/dashboard/metric-card';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatPercentage,
  formatCompactNumber,
} from '@/lib/utils/formatters';
import { useSyntaxKeywords } from '@/hooks/use-syntax';
import { usePortfolioFilter } from '@/components/providers/portfolio-filter-provider';
import {
  ChevronRight,
  Search,
  DollarSign,
  TrendingUp,
  Target,
} from 'lucide-react';

export default function SyntaxDrillDownPage({
  params,
}: {
  params: Promise<{ syntaxGroup: string }>;
}) {
  const { syntaxGroup } = use(params);
  const decodedGroup = decodeURIComponent(syntaxGroup);
  const { selectedPortfolio } = usePortfolioFilter();
  const { data: keywords, isLoading } = useSyntaxKeywords(decodedGroup, selectedPortfolio || undefined);

  const data = keywords ?? [];

  // Aggregate metrics
  const totalSpend = data.reduce((sum, k) => sum + k.metrics.cost, 0);
  const totalSales = data.reduce((sum, k) => sum + k.metrics.sales, 0);
  const totalClicks = data.reduce((sum, k) => sum + k.metrics.clicks, 0);
  const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/syntax" className="hover:text-foreground">
          Syntax
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">
          &ldquo;{decodedGroup}&rdquo;
        </span>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{decodedGroup}</h1>
        <p className="text-muted-foreground">
          {data.length} keyword{data.length !== 1 ? 's' : ''} in this syntax
          group
        </p>
      </div>

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
            title="Keywords"
            value={data.length}
            icon={Search}
            format="number"
          />
          <MetricCard
            title="Spend"
            value={totalSpend}
            icon={DollarSign}
            format="currency"
          />
          <MetricCard
            title="Sales"
            value={totalSales}
            icon={TrendingUp}
            format="currency"
          />
          <MetricCard
            title="ACOS"
            value={avgAcos}
            icon={Target}
            format="percentage"
            invertTrend
          />
        </div>
      )}

      {/* Keywords Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Keywords in &ldquo;{decodedGroup}&rdquo;
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No keywords found in this syntax group
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Keyword</th>
                    <th className="pb-3 pr-4 font-medium">Campaign</th>
                    <th className="pb-3 pr-4 font-medium">Ad Group</th>
                    <th className="pb-3 pr-4 font-medium">Match</th>
                    <th className="pb-3 pr-4 font-medium text-right">Bid</th>
                    <th className="pb-3 pr-4 font-medium text-right">
                      Impressions
                    </th>
                    <th className="pb-3 pr-4 font-medium text-right">
                      Clicks
                    </th>
                    <th className="pb-3 pr-4 font-medium text-right">CTR</th>
                    <th className="pb-3 pr-4 font-medium text-right">CPC</th>
                    <th className="pb-3 pr-4 font-medium text-right">Spend</th>
                    <th className="pb-3 pr-4 font-medium text-right">Sales</th>
                    <th className="pb-3 pr-4 font-medium text-right">ACOS</th>
                    <th className="pb-3 font-medium text-right">ROAS</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((kw) => (
                    <tr
                      key={kw.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {kw.keywordText}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {kw.campaignName}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {kw.adGroupName}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="uppercase text-xs">
                          {kw.matchType}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCurrency(kw.bid)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCompactNumber(kw.metrics.impressions)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCompactNumber(kw.metrics.clicks)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatPercentage(kw.metrics.ctr)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCurrency(kw.metrics.cpc)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCurrency(kw.metrics.cost)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCurrency(kw.metrics.sales)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className={cn(
                            kw.metrics.acos > 35
                              ? 'text-red-600 font-medium'
                              : ''
                          )}
                        >
                          {formatPercentage(kw.metrics.acos)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {kw.metrics.roas.toFixed(2)}x
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            kw.state === 'ENABLED'
                              ? 'default'
                              : kw.state === 'PAUSED'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="capitalize text-xs"
                        >
                          {kw.state.toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
