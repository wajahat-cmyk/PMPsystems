'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface SyntaxMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  sales: number;
  orders: number;
  ctr: number;
  cvr: number;
  cpc: number;
  acos: number;
  roas: number;
}

export interface SyntaxGroupData {
  syntaxGroup: string;
  keywordCount: number;
  campaignCount: number;
  metrics: SyntaxMetrics;
}

export interface SyntaxKeywordData {
  id: string;
  keywordText: string;
  matchType: string;
  bid: number;
  state: string;
  campaignName: string;
  adGroupName: string;
  metrics: SyntaxMetrics;
}

export interface SyntaxCampaignData {
  id: string;
  name: string;
  state: string;
  dailyBudget: number;
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

interface SyntaxFilters {
  days?: number;
  campaignType?: string;
  matchType?: string;
  root?: string;
  portfolio?: string;
}

export function useSyntax(filters?: SyntaxFilters) {
  return useQuery<SyntaxGroupData[]>({
    queryKey: ['syntax', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.days) params.set('days', String(filters.days));
      if (filters?.campaignType) params.set('campaignType', filters.campaignType);
      if (filters?.matchType) params.set('matchType', filters.matchType);
      if (filters?.root) params.set('root', filters.root);
      if (filters?.portfolio) params.set('portfolio', filters.portfolio);

      const query = params.toString();
      const { data } = await api.get(`/api/amazon/syntax${query ? `?${query}` : ''}`);
      return data.syntaxGroups;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });
}

export function useSyntaxKeywords(syntaxGroup: string, portfolio?: string) {
  return useQuery<SyntaxKeywordData[]>({
    queryKey: ['syntax', syntaxGroup, 'keywords', portfolio],
    queryFn: async () => {
      const encoded = encodeURIComponent(syntaxGroup);
      const params = new URLSearchParams();
      if (portfolio) params.set('portfolio', portfolio);
      const query = params.toString();
      const { data } = await api.get(
        `/api/amazon/syntax/${encoded}/keywords${query ? `?${query}` : ''}`
      );
      return data.keywords;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    enabled: !!syntaxGroup,
  });
}

export function useSyntaxCampaigns(syntaxGroup: string, portfolio?: string) {
  return useQuery<SyntaxCampaignData[]>({
    queryKey: ['syntax', syntaxGroup, 'campaigns', portfolio],
    queryFn: async () => {
      const encoded = encodeURIComponent(syntaxGroup);
      const params = new URLSearchParams();
      if (portfolio) params.set('portfolio', portfolio);
      const query = params.toString();
      const { data } = await api.get(
        `/api/amazon/syntax/${encoded}/campaigns${query ? `?${query}` : ''}`
      );
      return data.campaigns;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!syntaxGroup,
  });
}
