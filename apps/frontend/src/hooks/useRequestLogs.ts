'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { PaginatedResponse, RequestLogEntry } from '@api-perf/shared';

export function useRequestLogs(runId: string) {
  return useInfiniteQuery({
    queryKey: ['logs', runId],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get<PaginatedResponse<RequestLogEntry>>(`/runs/${runId}/logs?page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    enabled: Boolean(runId),
  });
}
