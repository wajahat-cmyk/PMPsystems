'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { CampaignData } from '@/hooks/use-campaigns';

export interface PlacementMetrics {
  placement: string;
  impressions: number;
  clicks: number;
  cost: number;
  sales: number;
  orders: number;
  ctr: number;
  cpc: number;
  acos: number;
  roas: number;
}

export interface CampaignSearchTerm {
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
}

export function useCampaignDetail(id: string) {
  return useQuery<CampaignData>({
    queryKey: ['campaigns', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/amazon/campaigns/${id}`);
      return data.campaign;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    enabled: !!id,
  });
}

export function usePlacementMetrics(id: string, placement?: string) {
  return useQuery<PlacementMetrics[]>({
    queryKey: ['campaigns', id, 'placements', placement],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (placement) params.set('placement', placement);

      const query = params.toString();
      const { data } = await api.get(
        `/api/amazon/campaigns/${id}/placements${query ? `?${query}` : ''}`
      );
      return data.placements;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    enabled: !!id,
  });
}

export function useCampaignSearchTerms(id: string) {
  return useQuery<CampaignSearchTerm[]>({
    queryKey: ['campaigns', id, 'search-terms'],
    queryFn: async () => {
      const { data } = await api.get(`/api/amazon/campaigns/${id}/search-terms`);
      return data.searchTerms;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    enabled: !!id,
  });
}
