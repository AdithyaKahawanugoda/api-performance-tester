import { testQueueEvents, testQueue } from './queue.client';
import { redisClient } from './redis.client';
import { TestRunModel, RequestLogModel } from '../db/models/index';
import { logger } from '../lib/logger';
import { REDIS_CHANNELS } from '@api-perf/shared';
import type { TestJobResult, AggregatedMetrics, HttpMethod, RunWindow } from '@api-perf/shared';
import { calculatePercentiles, average } from '@api-perf/shared';
import { RUN_RESULT_CACHE_PREFIX, JOB_RESULT_TTL_SECONDS } from '../config/constants';

function mergeWindows(allWorkerWindows: RunWindow[][]): RunWindow[] {
  const buckets = new Map<number, { rps: number[]; p50: number[]; p95: number[]; p99: number[]; errorRate: number[] }>();
  for (const workerWindows of allWorkerWindows) {
    for (const w of workerWindows) {
      const bucket = Math.floor(w.t / 500) * 500;
      if (!buckets.has(bucket)) buckets.set(bucket, { rps: [], p50: [], p95: [], p99: [], errorRate: [] });
      const b = buckets.get(bucket)!;
      b.rps.push(w.rps);
      b.p50.push(w.p50);
      b.p95.push(w.p95);
      b.p99.push(w.p99);
      b.errorRate.push(w.errorRate);
    }
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([t, b]) => ({
      t,
      rps: b.rps.reduce((s, v) => s + v, 0),
      p50: average(b.p50),
      p95: average(b.p95),
      p99: average(b.p99),
      errorRate: average(b.errorRate),
    }));
}

function aggregateJobResults(results: TestJobResult[]): AggregatedMetrics {
  const allLatencies: number[] = [];
  const allStatusCodes: number[] = [];
  let totalSuccess = 0;
  let totalFailure = 0;
  const urlMap: Record<string, { success: number; failure: number; latencies: number[] }> = {};

  let earliestStart = Infinity;
  let latestEnd = -Infinity;

  for (const r of results) {
    allLatencies.push(...r.latencies);
    allStatusCodes.push(...r.statusCodes);
    totalSuccess += r.statusCodes.filter((c) => c >= 200 && c < 400).length;
    totalFailure += r.errors.length + r.statusCodes.filter((c) => c >= 400 || c === 0).length;
    if (r.startedAt < earliestStart) earliestStart = r.startedAt;
    if (r.completedAt > latestEnd) latestEnd = r.completedAt;

    for (const [url, stats] of Object.entries(r.urlStats ?? {})) {
      if (!urlMap[url]) urlMap[url] = { success: 0, failure: 0, latencies: [] };
      urlMap[url].success += stats.success;
      urlMap[url].failure += stats.failure;
      urlMap[url].latencies.push(...stats.latencies);
    }
  }

  const durationMs = latestEnd - earliestStart;
  const totalRequests = allLatencies.length;
  const rps = durationMs > 0 ? (totalRequests / durationMs) * 1000 : 0;
  const percentiles = calculatePercentiles(allLatencies);
  const sorted = [...allLatencies].sort((a, b) => a - b);

  const statusCodeDistribution: Record<string, number> = {};
  for (const code of allStatusCodes) {
    const key = String(code);
    statusCodeDistribution[key] = (statusCodeDistribution[key] ?? 0) + 1;
  }

  const endpointStats = Object.entries(urlMap).map(([key, stats]) => {
    const colonIdx = key.indexOf(':');
    const method = key.slice(0, colonIdx) as HttpMethod;
    const url = key.slice(colonIdx + 1);
    return {
      url,
      method,
      successCount: stats.success,
      failureCount: stats.failure,
      avgLatency: average(stats.latencies),
      p99: calculatePercentiles(stats.latencies).p99,
    };
  });

  const windows = mergeWindows(results.map((r) => r.windows ?? []));

  return {
    totalRequests,
    successCount: totalSuccess,
    failureCount: totalFailure,
    rps,
    peakRps: rps * 1.5,
    minLatency: sorted[0] ?? 0,
    maxLatency: sorted[sorted.length - 1] ?? 0,
    avgLatency: average(allLatencies),
    ...percentiles,
    errorRate: totalRequests > 0 ? totalFailure / totalRequests : 0,
    bytesReceived: 0,
    durationMs,
    statusCodeDistribution,
    endpointStats,
    windows,
  };
}

export function registerQueueEvents(): void {
  testQueueEvents.on('progress', async ({ data }) => {
    const progress = data as { completed: number; total: number; workerId: number; runId: string };
    if (!progress?.runId) return;

    const msg = JSON.stringify({
      type: 'WORKER_PROGRESS',
      payload: { runId: progress.runId, workerId: progress.workerId, completed: progress.completed, total: progress.total },
      timestamp: Date.now(),
    });
    await redisClient.publish(REDIS_CHANNELS.RUN_STATUS(progress.runId), msg).catch(() => undefined);
  });

  testQueueEvents.on('completed', async ({ jobId }) => {
    try {
      const job = await testQueue.getJob(jobId);
      if (!job?.returnvalue) return;
      const result = job.returnvalue as TestJobResult;
      const { runId, totalWorkers } = result;
      const cacheKey = `${RUN_RESULT_CACHE_PREFIX}${runId}`;

      await redisClient.hset(cacheKey, jobId, JSON.stringify(result));
      await redisClient.expire(cacheKey, JOB_RESULT_TTL_SECONDS);

      // HINCRBY is atomic — exactly one job will receive count == totalWorkers
      const count = await redisClient.hincrby(cacheKey, '__count', 1);
      if (count < totalWorkers) return;

      const allEntries = await redisClient.hgetall(cacheKey);
      const allResults: TestJobResult[] = Object.entries(allEntries)
        .filter(([key]) => key !== '__count')
        .map(([, value]) => JSON.parse(value) as TestJobResult);
      const metrics = aggregateJobResults(allResults);

      const allLogs = allResults.flatMap((r) => r.requestLogs ?? []);
      if (allLogs.length > 0) {
        await RequestLogModel.insertMany(
          allLogs.map((l) => ({ ...l, runId, timestamp: new Date(l.timestamp) })),
          { ordered: false },
        ).catch(() => undefined);
      }

      await TestRunModel.findByIdAndUpdate(runId, {
        status: 'completed',
        completedAt: new Date(),
        metrics,
      });

      const completedMsg = JSON.stringify({
        type: 'RUN_COMPLETED',
        payload: { runId, metrics },
        timestamp: Date.now(),
      });
      await redisClient.publish(REDIS_CHANNELS.RUN_STATUS(runId), completedMsg);
      await redisClient.del(cacheKey);
    } catch (err) {
      logger.error({ err, jobId }, 'Error handling job completion');
    }
  });

  testQueueEvents.on('failed', async ({ jobId, failedReason }) => {
    try {
      const job = await testQueue.getJob(jobId);
      const runId = job?.data?.runId;
      if (!runId) return;

      await TestRunModel.findByIdAndUpdate(runId, {
        status: 'failed',
        error: failedReason,
        completedAt: new Date(),
      });

      const failedMsg = JSON.stringify({
        type: 'RUN_FAILED',
        payload: { runId, error: failedReason },
        timestamp: Date.now(),
      });
      await redisClient.publish(REDIS_CHANNELS.RUN_STATUS(runId), failedMsg);
    } catch (err) {
      logger.error({ err, jobId }, 'Error handling job failure');
    }
  });

  logger.info('Queue event listeners registered');
}
