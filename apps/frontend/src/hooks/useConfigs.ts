'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { TestConfig, PaginatedResponse, CreateTestConfigInput, UpdateTestConfigInput } from '@api-perf/shared';

export function useConfigs(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['configs', page, pageSize],
    queryFn: () => apiClient.get<PaginatedResponse<TestConfig>>(`/configs?page=${page}&pageSize=${pageSize}`),
    staleTime: 30_000,
  });
}

export function useConfig(id: string) {
  return useQuery({
    queryKey: ['configs', id],
    queryFn: () => apiClient.get<TestConfig>(`/configs/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTestConfigInput) => apiClient.post<TestConfig>('/configs', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configs'] }),
  });
}

export function useUpdateConfig(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTestConfigInput) => apiClient.patch<TestConfig>(`/configs/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configs'] });
      qc.invalidateQueries({ queryKey: ['configs', id] });
    },
  });
}

export function useDeleteConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/configs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configs'] }),
  });
}
