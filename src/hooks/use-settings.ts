import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// --- Data Source ---

export function useDataSource() {
  return useQuery({
    queryKey: ['data-source'],
    queryFn: async () => {
      const { data } = await api.get('/api/settings/data-source');
      return data as { dataSource: 'API' | 'BULK' };
    },
  });
}

export function useUpdateDataSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dataSource: 'API' | 'BULK') => {
      const { data } = await api.put('/api/settings/data-source', { dataSource });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-source'] });
    },
  });
}

// --- API Credentials ---

export function useApiCredentials() {
  return useQuery({
    queryKey: ['api-credentials'],
    queryFn: async () => {
      const { data } = await api.get('/api/settings/credentials');
      return data as {
        connected: boolean;
        clientId?: string;
        hasSecret?: boolean;
        profileId?: string;
        region?: string;
        countryCode?: string;
        currencyCode?: string;
        timezone?: string;
        accountType?: string;
        syncStatus?: string;
        lastSyncAt?: string;
      };
    },
  });
}

export function useSaveApiCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: {
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      profileId: string;
      region: string;
      countryCode?: string;
      currencyCode?: string;
      timezone?: string;
      accountType?: string;
    }) => {
      const { data } = await api.post('/api/settings/credentials', credentials);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['data-source'] });
      queryClient.invalidateQueries({ queryKey: ['amazon-profile'] });
    },
  });
}
