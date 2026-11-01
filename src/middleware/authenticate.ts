import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../errors';

// ── Augment Express Request ────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export interface AccessTokenPayload {
  sub: string;   // user._id (string)
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Verifies the JWT access token from the Authorization header.
 * Sets req.user if valid.
 * Throws 401 if missing, expired, or invalid.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Access token expired'));
    } else {
      next(new UnauthorizedError('Invalid access token'));
    }
  }
}
