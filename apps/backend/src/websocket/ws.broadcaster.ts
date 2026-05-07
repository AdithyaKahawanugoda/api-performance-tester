import { createRedisClient } from '../queue/redis.client';
import { wsRooms } from './ws.rooms';
import { logger } from '../lib/logger';

export function startBroadcaster(): void {
  const subscriber = createRedisClient('ws-broadcaster');

  subscriber.on('ready', async () => {
    await subscriber.psubscribe('metrics:*', 'logs:*', 'status:*');
    logger.info('WebSocket broadcaster subscribed to Redis channels');
  });

  subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
    const parts = channel.split(':');
    const runId = parts.slice(1).join(':');
    if (!runId) return;
    wsRooms.broadcast(runId, message);
  });

  subscriber.connect().catch((err: unknown) => {
    logger.error({ err }, 'Broadcaster Redis connection failed');
  });
}
