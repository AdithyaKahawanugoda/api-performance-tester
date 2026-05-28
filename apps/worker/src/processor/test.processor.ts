import type { Processor } from 'bullmq';
import type { TestJobData, TestJobResult, TestEndpoint } from '@api-perf/shared';
import { createRedisPublisher } from '../lib/redis.client';
import { executeRequest } from './request.executor';
import { MetricsCollector } from './metrics.collector';
import { env } from '../config/env';
import { logger } from '../lib/logger';

function selectEndpoint(endpoints: TestEndpoint[]): TestEndpoint {
  const totalWeight = endpoints.reduce((sum, e) => sum + (e.weight ?? 1), 0);
  let rand = Math.random() * totalWeight;
  for (const endpoint of endpoints) {
    rand -= (endpoint.weight ?? 1);
    if (rand <= 0) return endpoint;
  }
  return endpoints[endpoints.length - 1]!;
}

export const testProcessor: Processor<TestJobData, TestJobResult> = async (job) => {
  const { runId, config, workerIndex, totalWorkers } = job.data;
  const redis = createRedisPublisher();
  const collector = new MetricsCollector(runId, workerIndex, redis, env.METRICS_EMIT_INTERVAL_MS);

  const requestsPerWorker = Math.ceil(config.totalRequests / totalWorkers);
  const startedAt = Date.now();

  logger.info({ runId, workerIndex, requestsPerWorker }, 'Worker starting');

  try {
    for (let i = 0; i < requestsPerWorker; i++) {
      if ((await redis.exists(`cancel:${runId}`)) === 1) {
        logger.info({ runId, workerIndex }, 'Worker cancelled');
        break;
      }

      const endpoint = selectEndpoint(config.endpoints);
      const result = await executeRequest(endpoint, config.timeout, config.retries, config.captureResponseSize ?? false);
      collector.record(result);

      if (i > 0 && i % 100 === 0) {
        await job.updateProgress({ runId, workerId: workerIndex, completed: i, total: requestsPerWorker });
      }
    }
  } finally {
    await collector.flush();
    await redis.quit();
  }

  const completedAt = Date.now();
  logger.info({ runId, workerIndex, completedAt }, 'Worker completed');

  const urlStats: TestJobResult['urlStats'] = { ...collector.getUrlStats() };

  return {
    runId,
    workerIndex,
    totalWorkers,
    requestsExecuted: collector.getLatencies().length,
    latencies: collector.getLatencies(),
    statusCodes: collector.getStatusCodes(),
    errors: collector.getErrors(),
    requestLogs: collector.getLogs(),
    windows: collector.getWindows(),
    urlStats,
    startedAt,
    completedAt,
  };
};
