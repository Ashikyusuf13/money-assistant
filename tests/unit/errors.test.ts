import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '../../src/errors';

describe('AppError classes', () => {
  it('AppError has correct statusCode and code', () => {
    const err = new AppError('test', 400, 'TEST_CODE');
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('TEST_CODE');
    expect(err.isOperational).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('ValidationError has status 400 and code VALIDATION_ERROR', () => {
    const err = new ValidationError('invalid input', [{ field: 'email', message: 'invalid' }]);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toHaveLength(1);
  });

  it('UnauthorizedError has status 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('NotFoundError has status 404', () => {
    const err = new NotFoundError('Transaction');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Transaction not found');
  });

  it('ConflictError has status 409', () => {
    const err = new ConflictError('Email already registered');
    expect(err.statusCode).toBe(409);
  });
});
