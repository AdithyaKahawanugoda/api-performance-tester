import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { API_PREFIX } from './config/constants';
import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';
import apiRouter from './routes/index';

export function createApp(): express.Application {
  const app = express();

  app.use(helmet({ crossOriginEmbedderPolicy: false }));
  const localhostPattern = /^http:\/\/localhost:\d+$/;
  const corsOrigin =
    env.NODE_ENV === 'development'
      ? (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
          cb(null, !origin || localhostPattern.test(origin))
      : env.CORS_ORIGIN;
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== 'test' }));

  app.use(API_PREFIX, apiRateLimiter, apiRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use(errorHandler);

  return app;
}
