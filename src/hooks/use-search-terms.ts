'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface SearchTermData {
  searchTerm: string;
  keywordText?: string;
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

export function useKeywordSearchTerms(keywordId: string | null) {
  return useQuery<SearchTermData[]>({
    queryKey: ['keywords', keywordId, 'search-terms'],
    queryFn: async () => {
      const { data } = await api.get(`/api/amazon/keywords/${keywordId}/search-terms`);
      return data.searchTerms;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    enabled: keywordId !== null,
  });
}
