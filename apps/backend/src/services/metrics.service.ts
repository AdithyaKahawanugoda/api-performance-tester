import { TestRunModel } from '../db/models/index';
import { NotFoundError } from '../lib/errors';
import type { AggregatedMetrics, TimelineDataPoint } from '@api-perf/shared';
import { redisClient } from '../queue/redis.client';

export async function getRunMetrics(runId: string): Promise<AggregatedMetrics> {
  const doc = await TestRunModel.findById(runId).select('metrics status');
  if (!doc) throw new NotFoundError('TestRun');

  const plainDoc = doc.toObject({ versionKey: false });
  const metrics = plainDoc.metrics as AggregatedMetrics | undefined;
  if (!metrics) {
    return {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      rps: 0,
      peakRps: 0,
      minLatency: 0,
      maxLatency: 0,
      avgLatency: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      errorRate: 0,
      bytesReceived: 0,
      durationMs: 0,
      statusCodeDistribution: {},
      endpointStats: [],
    };
  }

  return {
    ...metrics,
    statusCodeDistribution:
      metrics.statusCodeDistribution instanceof Map
        ? Object.fromEntries(metrics.statusCodeDistribution as Map<string, number>)
        : (metrics.statusCodeDistribution ?? {}),
  };
}

export async function getTimelineData(runId: string): Promise<TimelineDataPoint[]> {
  const key = `timeline:${runId}`;
  const raw = await redisClient.lrange(key, 0, -1);
  return raw.map((item) => JSON.parse(item) as TimelineDataPoint);
}
