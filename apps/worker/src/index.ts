import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { QUEUE_NAMES } from '@api-perf/shared';
import { testProcessor } from './processor/test.processor';
import { env } from './config/env';
import { logger } from './lib/logger';

const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const worker = new Worker<import('@api-perf/shared').TestJobData, import('@api-perf/shared').TestJobResult>(
  QUEUE_NAMES.TEST_EXECUTION,
  testProcessor,
  {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY,
    autorun: true,
  },
);

worker.on('active', (job) => {
  logger.debug({ jobId: job.id, runId: job.data.runId, workerIndex: job.data.workerIndex }, 'Job active');
});

worker.on('completed', (job) => {
  logger.info({ jobId: job.id, runId: job.data.runId }, 'Job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job failed');
});

worker.on('error', (err) => {
  logger.error({ err }, 'Worker error');
});

logger.info({ concurrency: env.WORKER_CONCURRENCY }, 'Worker started');

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Worker shutting down...');
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception in worker');
  process.exit(1);
});
