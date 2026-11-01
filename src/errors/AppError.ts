/**
 * Custom application error classes.
 * All errors carry a machine-readable code and an HTTP status.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown[],
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── HTTP 400 ─────────────────────────────────────────────────────────────────
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown[]) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// ─── HTTP 401 ─────────────────────────────────────────────────────────────────
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

// ─── HTTP 403 ─────────────────────────────────────────────────────────────────
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

// ─── HTTP 404 ─────────────────────────────────────────────────────────────────
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

// ─── HTTP 409 ─────────────────────────────────────────────────────────────────
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

// ─── HTTP 422 ─────────────────────────────────────────────────────────────────
export class UnprocessableError extends AppError {
  constructor(message: string, details?: unknown[]) {
    super(message, 422, 'UNPROCESSABLE', details);
    this.name = 'UnprocessableError';
  }
}

// ─── HTTP 429 ─────────────────────────────────────────────────────────────────
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// ─── HTTP 500 ─────────────────────────────────────────────────────────────────
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR', undefined, false);
    this.name = 'InternalError';
  }
}
