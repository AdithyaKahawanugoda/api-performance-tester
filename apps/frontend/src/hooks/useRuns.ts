'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { TestRun, PaginatedResponse } from '@api-perf/shared';

export function useRuns(filters?: { status?: string; configId?: string; page?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.configId) params.set('configId', filters.configId);
  if (filters?.page) params.set('page', String(filters.page));

  return useQuery({
    queryKey: ['runs', filters],
    queryFn: () => apiClient.get<PaginatedResponse<TestRun>>(`/runs?${params.toString()}`),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const hasRunning = items.some((r) => r.status === 'running' || r.status === 'queued');
      return hasRunning ? 3000 : false;
    },
  });
}

export function useRun(id: string) {
  return useQuery({
    queryKey: ['runs', id],
    queryFn: () => apiClient.get<TestRun>(`/runs/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'running' || status === 'queued' ? 3000 : false;
    },
  });
}

export function useStartRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (configId: string) => apiClient.post<TestRun>('/runs', { configId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runs'] }),
  });
}

export function useCancelRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<TestRun>(`/runs/${id}/cancel`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['runs'] });
      qc.invalidateQueries({ queryKey: ['runs', id] });
    },
  });
}

export function useCompareRuns(ids: string[]) {
  return useQuery({
    queryKey: ['runs', 'compare', ids],
    queryFn: () => apiClient.get<TestRun[]>(`/runs/compare?ids=${ids.join(',')}`),
    enabled: ids.length >= 2,
  });
}
