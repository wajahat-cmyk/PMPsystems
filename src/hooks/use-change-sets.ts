'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface ChangeSetSummary {
  id: string;
  name: string | null;
  status: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  exportedAt: string | null;
  appliedAt: string | null;
}

export interface ChangeSetItemData {
  id: string;
  entityType: 'CAMPAIGN' | 'KEYWORD';
  entityId: string;
  entityName: string;
  campaignName: string | null;
  adGroupName: string | null;
  amazonCampaignId: string | null;
  amazonAdGroupId: string | null;
  amazonKeywordId: string | null;
  matchType: string | null;
  changes: Record<string, unknown>;
  previousValues: Record<string, unknown> | null;
}

export interface ChangeSetDetail extends ChangeSetSummary {
  items: ChangeSetItemData[];
}

export function useChangeSets() {
  return useQuery<ChangeSetSummary[]>({
    queryKey: ['change-sets'],
    queryFn: async () => {
      const { data } = await api.get('/api/change-sets');
      return data.changeSets;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useChangeSet(id: string | null) {
  return useQuery<ChangeSetDetail>({
    queryKey: ['change-sets', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/change-sets/${id}`);
      return data.changeSet;
    },
    enabled: !!id,
  });
}

export interface CreateChangeSetItem {
  entityType: 'CAMPAIGN' | 'KEYWORD';
  entityId: string;
  entityName: string;
  campaignName?: string;
  adGroupName?: string;
  amazonCampaignId?: string;
  amazonAdGroupId?: string;
  amazonKeywordId?: string;
  matchType?: string;
  changes: Record<string, unknown>;
  previousValues?: Record<string, unknown>;
}

export function useCreateChangeSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name?: string; items: CreateChangeSetItem[] }) => {
      const { data } = await api.post('/api/change-sets', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-sets'] });
    },
  });
}

export function useExportChangeSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/change-sets/${id}/export`, null, {
        responseType: 'blob',
      });
      return data as Blob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-sets'] });
    },
  });
}

export function useApplyChangeSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/api/change-sets/${id}/apply`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-sets'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
    },
  });
}

export function useDeleteChangeSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/change-sets/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-sets'] });
    },
  });
}
