import mongoose from 'mongoose';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export async function connectDB(): Promise<void> {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 10000,
      });
      logger.info('MongoDB connected');
      return;
    } catch (err) {
      attempt++;
      logger.warn({ err, attempt, maxRetries }, 'MongoDB connection failed, retrying...');
      if (attempt >= maxRetries) throw err;
      await new Promise((res) => setTimeout(res, 2000 * attempt));
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
