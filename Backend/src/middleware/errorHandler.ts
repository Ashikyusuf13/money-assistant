import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MongoError } from 'mongodb';
import mongoose from 'mongoose';
import { AppError, ValidationError, InternalError } from '../errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { sendError } from '../utils/response';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req.headers['x-request-id'] as string) ?? 'unknown';

  // ── Zod validation error ─────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    logger.warn('Validation error', { requestId, issues: details });
    sendError(res, new ValidationError('The request is invalid.', details));
    return;
  }

  // ── Known operational AppError ───────────────────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Operational server error', {
        requestId,
        code: err.code,
        message: err.message,
        stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
      });
    } else {
      logger.warn('Client error', { requestId, code: err.code, message: err.message });
    }
    sendError(res, err);
    return;
  }

  // ── MongoDB duplicate key ────────────────────────────────────────────────
  if (err instanceof MongoError && (err as MongoError & { code?: number }).code === 11000) {
    const conflict = new AppError('Duplicate value — this record already exists.', 409, 'CONFLICT');
    logger.warn('MongoDB duplicate key', { requestId });
    sendError(res, conflict);
    return;
  }

  // ── Mongoose CastError (invalid ObjectId) ────────────────────────────────
  if (err instanceof mongoose.Error.CastError) {
    const cast = new AppError(`Invalid value for field: ${err.path}`, 400, 'INVALID_ID');
    sendError(res, cast);
    return;
  }

  // ── Body-parser payload limits & malformed JSON ───────────────────────────
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const errType = (err as { type: string }).type;
    if (errType === 'entity.too.large') {
      sendError(res, new AppError('Request payload exceeds allowed limit.', 413, 'PAYLOAD_TOO_LARGE'));
      return;
    }
    if (errType === 'entity.parse.failed') {
      sendError(res, new ValidationError('Malformed JSON in request body.'));
      return;
    }
  }

  // ── Unknown / programmer error ───────────────────────────────────────────
  logger.error('Unexpected error', {
    requestId,
    error: String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  sendError(res, new InternalError());
}

export function notFoundHandler(req: Request, res: Response): void {
  const appErr = new AppError(`Route not found: ${req.method} ${req.path}`, 404, 'ROUTE_NOT_FOUND');
  sendError(res, appErr);
}
