import { Queue, QueueEvents } from 'bullmq';
import { QUEUE_NAMES } from '@api-perf/shared';
import type { TestJobData, TestJobResult } from '@api-perf/shared';
import { createRedisClient } from './redis.client';
import { env } from '../config/env';

export const testQueue = new Queue<TestJobData, TestJobResult>(QUEUE_NAMES.TEST_EXECUTION, {
  connection: createRedisClient('queue'),
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 5000 },
  },
});

export const testQueueEvents = new QueueEvents(QUEUE_NAMES.TEST_EXECUTION, {
  connection: createRedisClient('queue-events'),
});
