import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/response';

function getClientMeta(req: Request): { userAgent?: string; ipAddress?: string } {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}

// ── POST /auth/register ────────────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, timezone } = req.body as {
      name: string;
      email: string;
      password: string;
      timezone?: string;
    };

    const result = await authService.register(name, email, password, timezone, getClientMeta(req));

    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/login ───────────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login(email, password, getClientMeta(req));
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/refresh ─────────────────────────────────────────────────────────

export async function refreshTokens(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await authService.refreshTokens(refreshToken, getClientMeta(req));
    sendSuccess(res, tokens);
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/logout ──────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    await authService.logout(refreshToken);
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/logout-all ──────────────────────────────────────────────────────

export async function logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logoutAll(req.user!.id);
    sendSuccess(res, { message: 'All sessions revoked' });
  } catch (err) {
    next(err);
  }
}

// ── GET /auth/sessions ─────────────────────────────────────────────────────────

export async function listSessions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessions = await authService.listSessions(req.user!.id);
    sendSuccess(res, sessions);
  } catch (err) {
    next(err);
  }
}

// ── DELETE /auth/sessions/:sessionId ──────────────────────────────────────────

export async function revokeSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.revokeSession(req.user!.id, req.params['sessionId'] ?? '');
    sendSuccess(res, { message: 'Session revoked' });
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/change-password ─────────────────────────────────────────────────

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    sendSuccess(res, { message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/forgot-password ─────────────────────────────────────────────────

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    const result = await authService.forgotPassword(email);
    // Always return same shape to prevent enumeration
    sendSuccess(res, {
      message: 'If that email exists, a reset token has been sent.',
      // Include token in response for API clients (in production: email it, don't return it)
      resetToken: result.resetToken !== 'noop' ? result.resetToken : undefined,
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/reset-password ──────────────────────────────────────────────────

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    await authService.resetPassword(token, newPassword);
    sendSuccess(res, { message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
}

// ── GET /auth/me ───────────────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
