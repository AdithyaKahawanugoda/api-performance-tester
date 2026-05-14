'use client';

import { useEffect } from 'react';
import { useRunStore } from '@/store/runStore';
import { useWsStore } from '@/store/wsStore';
import type { MetricsWindow } from '@api-perf/shared';

export function useLiveMetrics(runId: string): MetricsWindow[] {
  const metricsBuffer = useRunStore((s) => s.metricsBuffer[runId] ?? []);
  const { addSubscription, removeSubscription } = useWsStore();

  useEffect(() => {
    if (!runId) return;
    addSubscription(runId);
    return () => removeSubscription(runId);
  }, [runId, addSubscription, removeSubscription]);

  return metricsBuffer;
}
