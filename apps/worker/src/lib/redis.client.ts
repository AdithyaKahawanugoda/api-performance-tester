import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

export function createRedisPublisher(): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  client.on('error', (err) => logger.error({ err }, 'Redis publisher error'));
  return client;
}
