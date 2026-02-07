'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface RootMetrics {
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

export interface RootGroupData {
  root: string;
  syntaxGroupCount: number;
  keywordCount: number;
  campaignCount: number;
  metrics: RootMetrics;
  subGroups: string[];
}

interface RootIndexFilters {
  days?: number;
  portfolio?: string;
}

export function useRootIndex(filters?: RootIndexFilters) {
  return useQuery<RootGroupData[]>({
    queryKey: ['root-index', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.days) params.set('days', String(filters.days));
      if (filters?.portfolio) params.set('portfolio', filters.portfolio);

      const query = params.toString();
      const { data } = await api.get(`/api/amazon/root-index${query ? `?${query}` : ''}`);
      return data.roots;
    },
    staleTime: 5 * 60 * 1000,
  });
}
