'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignTable } from '@/components/dashboard/campaign-table';
import { CampaignPerformanceChart } from '@/components/charts/campaign-performance-chart';
import { ChangeSetModal } from '@/components/dashboard/change-set-modal';
import { useCampaigns } from '@/hooks/use-campaigns';
import { usePortfolioFilter } from '@/components/providers/portfolio-filter-provider';

export default function CampaignsPage() {
  const { selectedPortfolio } = usePortfolioFilter();
  const { data: campaigns, isLoading } = useCampaigns(selectedPortfolio || undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = campaigns ?? [];
  const enabled = data.filter((c) => c.state === 'enabled');
  const paused = data.filter((c) => c.state === 'paused');
  const archived = data.filter((c) => c.state === 'archived');

  // Combined time-series for all campaigns
  const combinedMetrics = new Map<
    string,
    { impressions: number; clicks: number; cost: number; sales: number }
  >();
  for (const campaign of enabled) {
    for (const metric of campaign.metricsHistory) {
      const existing = combinedMetrics.get(metric.date) ?? {
        impressions: 0,
        clicks: 0,
        cost: 0,
        sales: 0,
      };
      existing.impressions += metric.impressions;
      existing.clicks += metric.clicks;
      existing.cost += metric.cost;
      existing.sales += metric.sales;
      combinedMetrics.set(metric.date, existing);
    }
  }

  const chartData = Array.from(combinedMetrics.entries()).map(
    ([date, m]) => ({ date, ...m })
  );

  const selectedEntities = data
    .filter((c) => selectedIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      amazonCampaignId: c.amazonCampaignId,
      currentBudget: c.dailyBudget,
      currentState: c.state,
      currentTos: c.tosModifier ?? undefined,
      currentRos: c.rosModifier ?? undefined,
      currentPdp: c.pdpModifier ?? undefined,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage and monitor all your campaigns
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

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignPerformanceChart data={chartData} />
        </CardContent>
      </Card>

      {/* Campaigns Table with Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({data.length})</TabsTrigger>
              <TabsTrigger value="enabled">
                Enabled ({enabled.length})
              </TabsTrigger>
              <TabsTrigger value="paused">
                Paused ({paused.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archived ({archived.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <CampaignTable
                campaigns={data}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </TabsContent>
            <TabsContent value="enabled" className="mt-4">
              <CampaignTable
                campaigns={enabled}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </TabsContent>
            <TabsContent value="paused" className="mt-4">
              <CampaignTable
                campaigns={paused}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </TabsContent>
            <TabsContent value="archived" className="mt-4">
              <CampaignTable
                campaigns={archived}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ChangeSetModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        entityType="CAMPAIGN"
        selectedEntities={selectedEntities}
        onSuccess={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
