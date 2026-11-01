import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { AppError } from '../errors';
import { sendError } from '../utils/response';
import { Response } from 'express';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res: Response) => {
    sendError(res, new AppError('Too many requests. Please slow down.', 429, 'RATE_LIMIT_EXCEEDED'));
  },
});

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res: Response) => {
    sendError(res, new AppError('Too many authentication attempts.', 429, 'AUTH_RATE_LIMIT_EXCEEDED'));
  },
});
