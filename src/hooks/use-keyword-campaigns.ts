'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface KeywordCampaignData {
  campaignId: string;
  campaignName: string;
  adGroupName: string;
  matchType: string;
  bid: number;
  state: string;
  portfolio: string | null;
  metrics: {
    impressions: number;
    clicks: number;
    cost: number;
    sales: number;
    orders: number;
    acos: number;
    roas: number;
  };
}

export function useKeywordCampaigns(keywordId: string, portfolio?: string) {
  return useQuery<KeywordCampaignData[]>({
    queryKey: ['keyword-campaigns', keywordId, portfolio],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (portfolio) params.set('portfolio', portfolio);
      const query = params.toString();
      const { data } = await api.get(
        `/api/amazon/keywords/${keywordId}/campaigns${query ? `?${query}` : ''}`
      );
      return data.campaigns;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!keywordId,
  });
}
