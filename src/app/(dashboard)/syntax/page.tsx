'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/dashboard/metric-card';
import { SyntaxTable } from '@/components/dashboard/syntax-table';
import { useSyntax } from '@/hooks/use-syntax';
import { usePortfolioFilter } from '@/components/providers/portfolio-filter-provider';
import { TextCursorInput, DollarSign, TrendingUp, Target } from 'lucide-react';

export default function SyntaxPage() {
  const [days, setDays] = useState(30);
  const [campaignType, setCampaignType] = useState('');
  const [matchType, setMatchType] = useState('');
  const [root, setRoot] = useState('');
  const { selectedPortfolio } = usePortfolioFilter();

  const { data: syntaxGroups, isLoading } = useSyntax({
    days,
    campaignType: campaignType || undefined,
    matchType: matchType || undefined,
    root: root || undefined,
    portfolio: selectedPortfolio || undefined,
  });

  const groups = syntaxGroups ?? [];

  // Aggregate metrics across all groups
  const totalSpend = groups.reduce((sum, g) => sum + g.metrics.cost, 0);
  const totalSales = groups.reduce((sum, g) => sum + g.metrics.sales, 0);
  const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Syntax Analysis</h1>
        <p className="text-muted-foreground">
          Group keywords by subroot patterns to analyze performance
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Campaign Type</label>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="SPONSORED_PRODUCTS">
                    Sponsored Products
                  </SelectItem>
                  <SelectItem value="SPONSORED_BRANDS">
                    Sponsored Brands
                  </SelectItem>
                  <SelectItem value="SPONSORED_DISPLAY">
                    Sponsored Display
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Match Type</label>
              <Select value={matchType} onValueChange={setMatchType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Match" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Match</SelectItem>
                  <SelectItem value="EXACT">Exact</SelectItem>
                  <SelectItem value="PHRASE">Phrase</SelectItem>
                  <SelectItem value="BROAD">Broad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Root Filter</label>
              <Input
                placeholder="e.g. bamboo sheets"
                value={root}
                onChange={(e) => setRoot(e.target.value)}
                className="w-[200px]"
              />
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
            title="Total Groups"
            value={groups.length}
            icon={TextCursorInput}
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

      {/* Syntax Groups Table */}
      <SyntaxTable syntaxGroups={groups} loading={isLoading} />
    </div>
  );
}
