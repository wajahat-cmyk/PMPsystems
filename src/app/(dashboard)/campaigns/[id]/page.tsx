'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/dashboard/metric-card';
import { PlacementSelector } from '@/components/dashboard/placement-selector';
import { SearchTermTable } from '@/components/dashboard/search-term-table';
import { CampaignPerformanceChart } from '@/components/charts/campaign-performance-chart';
import {
  formatCurrency,
  formatPercentage,
} from '@/lib/utils/formatters';
import {
  ChevronRight,
  DollarSign,
  TrendingUp,
  Target,
  MousePointerClick,
} from 'lucide-react';

interface CampaignDetail {
  id: string;
  name: string;
  campaignType: string;
  targetingType: string;
  state: string;
  dailyBudget: number;
  targetAcos: number | null;
  targetRoas: number | null;
  tosModifier: number | null;
  rosModifier: number | null;
  pdpModifier: number | null;
  adGroups: Array<{
    id: string;
    name: string;
    defaultBid: number;
    state: string;
    keywordCount: number;
  }>;
  thirtyDay: {
    impressions: number;
    clicks: number;
    cost: number;
    sales: number;
    orders: number;
    units: number;
    acos: number;
    roas: number;
    ctr: number;
    cpc: number;
  };
  metricsHistory: Array<{
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    sales: number;
    orders: number;
    acos: number;
    roas: number;
  }>;
}

interface PlacementGroup {
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    sales: number;
    orders: number;
    ctr: number;
    cpc: number;
    acos: number;
    roas: number;
  };
  history: Array<{
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    sales: number;
  }>;
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [placement, setPlacement] = useState('ALL');

  // Fetch campaign detail
  const { data: campaign, isLoading: campaignLoading } =
    useQuery<CampaignDetail>({
      queryKey: ['campaigns', id],
      queryFn: async () => {
        const { data } = await axios.get(`/api/amazon/campaigns/${id}`);
        return data.campaign;
      },
      staleTime: 5 * 60 * 1000,
      enabled: !!id,
    });

  // Fetch placement metrics
  const { data: placements, isLoading: placementsLoading } = useQuery<
    Record<string, PlacementGroup>
  >({
    queryKey: ['campaigns', id, 'placements'],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/amazon/campaigns/${id}/placements`
      );
      return data.placements;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });

  // Fetch search terms
  const { data: searchTerms, isLoading: searchTermsLoading } = useQuery<
    Array<{
      searchTerm: string;
      keywordText: string;
      impressions: number;
      clicks: number;
      cost: number;
      sales: number;
      orders: number;
      ctr: number;
      cpc: number;
      acos: number;
      roas: number;
    }>
  >({
    queryKey: ['campaigns', id, 'search-terms'],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/amazon/campaigns/${id}/search-terms`
      );
      return data.searchTerms;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });

  // Compute metrics based on selected placement
  const metrics = useMemo(() => {
    if (placement === 'ALL' || !placements) {
      return campaign?.thirtyDay ?? null;
    }
    return placements[placement]?.totals ?? null;
  }, [placement, placements, campaign]);

  // Compute chart data based on selected placement
  const chartData = useMemo(() => {
    if (placement === 'ALL' || !placements) {
      return campaign?.metricsHistory ?? [];
    }
    return placements[placement]?.history ?? [];
  }, [placement, placements, campaign]);

  if (campaignLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-72" />
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
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Campaign not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/campaigns" className="hover:text-foreground">
          Campaigns
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{campaign.name}</span>
      </div>

      {/* Campaign Header */}
      <div>
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="outline">{campaign.campaignType.replace(/_/g, ' ')}</Badge>
          <span>{campaign.targetingType}</span>
          <Badge
            variant={
              campaign.state === 'ENABLED'
                ? 'default'
                : campaign.state === 'PAUSED'
                  ? 'secondary'
                  : 'outline'
            }
            className="capitalize"
          >
            {campaign.state.toLowerCase()}
          </Badge>
          <span>Budget: {formatCurrency(campaign.dailyBudget)}/day</span>
          {campaign.targetAcos && (
            <span>ACOS Target: {formatPercentage(campaign.targetAcos)}</span>
          )}
        </div>
        {(campaign.tosModifier !== null ||
          campaign.rosModifier !== null ||
          campaign.pdpModifier !== null) && (
          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
            {campaign.tosModifier !== null && (
              <span>TOS: +{campaign.tosModifier}%</span>
            )}
            {campaign.rosModifier !== null && (
              <span>ROS: +{campaign.rosModifier}%</span>
            )}
            {campaign.pdpModifier !== null && (
              <span>PDP: +{campaign.pdpModifier}%</span>
            )}
          </div>
        )}
      </div>

      {/* Placement Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Placement:</span>
        <PlacementSelector value={placement} onValueChange={setPlacement} />
      </div>

      {/* Metric Cards */}
      {metrics ? (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Spend"
            value={metrics.cost}
            icon={DollarSign}
            format="currency"
          />
          <MetricCard
            title="Sales"
            value={metrics.sales}
            icon={TrendingUp}
            format="currency"
          />
          <MetricCard
            title="ACOS"
            value={metrics.acos}
            icon={Target}
            format="percentage"
            invertTrend
          />
          <MetricCard
            title="ROAS"
            value={metrics.roas}
            icon={MousePointerClick}
            format="number"
          />
        </div>
      ) : (
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
      )}

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignPerformanceChart data={chartData} />
        </CardContent>
      </Card>

      {/* Search Terms */}
      <SearchTermTable
        searchTerms={searchTerms ?? []}
        loading={searchTermsLoading}
      />

      {/* Ad Groups */}
      {campaign.adGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ad Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Ad Group</th>
                    <th className="pb-3 pr-4 font-medium text-right">
                      Default Bid
                    </th>
                    <th className="pb-3 pr-4 font-medium text-right">
                      Keywords
                    </th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.adGroups.map((ag) => (
                    <tr
                      key={ag.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium">{ag.name}</td>
                      <td className="py-3 pr-4 text-right">
                        {formatCurrency(ag.defaultBid)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {ag.keywordCount}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            ag.state === 'ENABLED'
                              ? 'default'
                              : ag.state === 'PAUSED'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="capitalize text-xs"
                        >
                          {ag.state.toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
