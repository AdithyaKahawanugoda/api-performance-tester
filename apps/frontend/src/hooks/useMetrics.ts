'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { AggregatedMetrics, TimelineDataPoint } from '@api-perf/shared';

export function useRunMetrics(runId: string) {
  return useQuery({
    queryKey: ['metrics', runId],
    queryFn: () => apiClient.get<AggregatedMetrics>(`/runs/${runId}/metrics`),
    enabled: Boolean(runId),
    staleTime: 60_000,
  });
}

export function useRunTimeline(runId: string) {
  return useQuery({
    queryKey: ['timeline', runId],
    queryFn: () => apiClient.get<TimelineDataPoint[]>(`/runs/${runId}/metrics/timeline`),
    enabled: Boolean(runId),
  });
}
