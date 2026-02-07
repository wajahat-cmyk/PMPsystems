'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricCard } from '@/components/dashboard/metric-card';
import { KeywordTable, type KeywordData } from '@/components/dashboard/keyword-table';
import { ChangeSetModal } from '@/components/dashboard/change-set-modal';
import { Search, TrendingUp, DollarSign, Target } from 'lucide-react';
import { usePortfolioFilter } from '@/components/providers/portfolio-filter-provider';

export default function KeywordsPage() {
  const { selectedPortfolio } = usePortfolioFilter();

  const { data: keywords, isLoading } = useQuery<KeywordData[]>({
    queryKey: ['keywords', selectedPortfolio],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPortfolio) params.set('portfolio', selectedPortfolio);
      const query = params.toString();
      const { data } = await api.get(`/api/amazon/keywords${query ? `?${query}` : ''}`);
      return data.keywords;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

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
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = keywords ?? [];
  const enabled = data.filter((k) => k.state === 'ENABLED');
  const paused = data.filter((k) => k.state === 'PAUSED');

  // Top performers (lowest ACOS with meaningful spend)
  const topPerformers = [...data]
    .filter((k) => k.metrics.cost > 0 && k.metrics.sales > 0)
    .sort((a, b) => a.metrics.acos - b.metrics.acos)
    .slice(0, 20);

  // Worst performers (highest ACOS)
  const worstPerformers = [...data]
    .filter((k) => k.metrics.cost > 0)
    .sort((a, b) => b.metrics.acos - a.metrics.acos)
    .slice(0, 20);

  // Aggregate metrics
  const totalSpend = data.reduce((sum, k) => sum + k.metrics.cost, 0);
  const totalSales = data.reduce((sum, k) => sum + k.metrics.sales, 0);
  const avgAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;

  const selectedEntities = data
    .filter((k) => selectedIds.has(k.id))
    .map((k) => ({
      id: k.id,
      name: k.keywordText,
      campaignName: k.campaignName,
      adGroupName: k.adGroupName,
      amazonKeywordId: k.amazonKeywordId,
      amazonAdGroupId: k.amazonAdGroupId,
      amazonCampaignId: k.amazonCampaignId,
      matchType: k.matchType,
      currentBid: k.bid,
      currentState: k.state,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Keywords</h1>
          <p className="text-muted-foreground">
            Analyze keyword performance and optimize your bids
          </p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button onClick={() => setBulkModalOpen(true)}>
              Bulk Actions
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Keywords"
          value={data.length}
          icon={Search}
          format="number"
        />
        <MetricCard
          title="Keyword Spend"
          value={totalSpend}
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="Keyword Sales"
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
      </div>

      {/* Keywords Table with Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({data.length})</TabsTrigger>
              <TabsTrigger value="top">Top Performers</TabsTrigger>
              <TabsTrigger value="worst">Needs Optimization</TabsTrigger>
              <TabsTrigger value="enabled">
                Enabled ({enabled.length})
              </TabsTrigger>
              <TabsTrigger value="paused">
                Paused ({paused.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <KeywordTable
                keywords={data}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                expandable
              />
            </TabsContent>
            <TabsContent value="top" className="mt-4">
              <KeywordTable
                keywords={topPerformers}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                expandable
              />
            </TabsContent>
            <TabsContent value="worst" className="mt-4">
              <KeywordTable
                keywords={worstPerformers}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                expandable
              />
            </TabsContent>
            <TabsContent value="enabled" className="mt-4">
              <KeywordTable
                keywords={enabled}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                expandable
              />
            </TabsContent>
            <TabsContent value="paused" className="mt-4">
              <KeywordTable
                keywords={paused}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                expandable
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ChangeSetModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        entityType="KEYWORD"
        selectedEntities={selectedEntities}
        onSuccess={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
