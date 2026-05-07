import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../lib/logger';

function createRedisClient(name: string): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on('connect', () => logger.info({ name }, 'Redis connected'));
  client.on('error', (err) => logger.error({ err, name }, 'Redis error'));
  client.on('close', () => logger.warn({ name }, 'Redis connection closed'));

  return client;
}

export const redisClient = createRedisClient('main');
export const redisSubscriber = createRedisClient('subscriber');

export { createRedisClient };
