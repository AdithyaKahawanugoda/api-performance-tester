import http from 'http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './db/connection';
import { redisClient } from './queue/redis.client';
import { registerQueueEvents } from './queue/queue.events';
import { createWsServer, handleUpgrade } from './websocket/ws.server';
import { startBroadcaster } from './websocket/ws.broadcaster';
import { env } from './config/env';
import { logger } from './lib/logger';

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  createWsServer();
  startBroadcaster();
  registerQueueEvents();

  server.on('upgrade', (req, socket, head) => {
    handleUpgrade(req, socket as unknown as import('stream').Duplex, head);
  });

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutting down...');
    server.close(async () => {
      await disconnectDB();
      await redisClient.quit();
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
