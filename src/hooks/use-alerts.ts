'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface AlertData {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  metadata: any;
  isRead: boolean;
  isResolved: boolean;
  triggeredAt: string;
  readAt: string | null;
  resolvedAt: string | null;
}

export function useAlerts() {
  return useQuery<AlertData[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await api.get('/api/alerts');
      return data.alerts;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data } = await api.patch(`/api/alerts/${alertId}`, {
        isRead: true,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
