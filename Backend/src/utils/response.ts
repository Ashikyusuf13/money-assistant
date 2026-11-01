import { Response } from 'express';
import { AppError } from '../errors/AppError';

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void {
  const body: SuccessResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

export function sendError(res: Response, error: AppError): void {
  const body: ErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };
  if (error.details) body.error.details = error.details;
  res.status(error.statusCode).json(body);
}
