'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface CampaignData {
  id: string;
  amazonCampaignId: string;
  name: string;
  campaignType: string;
  targetingType: string;
  state: string;
  dailyBudget: number;
  startDate: string;
  endDate: string | null;
  targetAcos: number | null;
  targetRoas: number | null;
  portfolio: string | null;
  tosModifier: number | null;
  rosModifier: number | null;
  pdpModifier: number | null;
  latest: {
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    sales: number;
    orders: number;
    units: number;
    ctr: number;
    cpc: number;
    acos: number;
    roas: number;
  } | null;
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

export function useCampaigns(portfolio?: string) {
  return useQuery<CampaignData[]>({
    queryKey: ['campaigns', portfolio],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (portfolio) params.set('portfolio', portfolio);
      const query = params.toString();
      const { data } = await api.get(`/api/amazon/campaigns${query ? `?${query}` : ''}`);
      return data.campaigns;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });
}

export function useSyncCampaigns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/amazon/sync');
      return data;
    },
    onSuccess: () => {
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
