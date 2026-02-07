'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface ReportUploadData {
  id: string;
  fileName: string;
  reportMonth: string;
  status: string;
  campaignCount: number;
  keywordCount: number;
  searchTermCount: number;
  errorMessage: string | null;
  createdAt: string;
}

export function useReportHistory() {
  return useQuery<ReportUploadData[]>({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data } = await api.get('/api/reports');
      return data.uploads;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useUploadReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/api/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minutes for large files
      });
      return data;
    },
    onSuccess: () => {
      // Invalidate everything so the dashboard refreshes with new data
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      queryClient.invalidateQueries({ queryKey: ['syntax'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['amazon-profile'] });
    },
  });
}
