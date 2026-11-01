import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors';

/**
 * Generic validation middleware factory.
 * Validates `req.body`, `req.query`, and `req.params` against a Zod schema
 * shaped as `{ body?, query?, params? }`.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (typeof parsed === 'object' && parsed !== null) {
        const p = parsed as Record<string, unknown>;
        if (p['body']) req.body = p['body'];
        if (p['query']) req.query = p['query'] as typeof req.query;
        if (p['params']) req.params = p['params'] as typeof req.params;
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        next(new ValidationError('The request is invalid.', details));
      } else {
        next(err);
      }
    }
  };
}
