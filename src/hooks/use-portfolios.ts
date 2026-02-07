'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export function usePortfolios() {
  return useQuery<string[]>({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const { data } = await api.get('/api/amazon/portfolios');
      return data.portfolios;
    },
    staleTime: 10 * 60 * 1000,
  });
}
