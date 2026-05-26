import type { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { AppError, ValidationError, NotFoundError } from '../lib/errors';
import { logger } from '../lib/logger';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, issues: err.issues },
    });
    return;
  }

  if (err instanceof MongooseError.CastError) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
    return;
  }

  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  logger.error({ err }, 'Unexpected error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
}
