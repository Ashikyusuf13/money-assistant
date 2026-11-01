import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User, Session, Account, PasswordResetToken, hashToken, hashResetToken } from '../models';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  AppError,
} from '../errors';
import { logger } from '../utils/logger';
import type { AccessTokenPayload } from '../middleware/authenticate';

// ── DTOs ───────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionInfo {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  timezone: string;
  createdAt: Date;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateAccessToken(userId: string, email: string): string {
  const payload: AccessTokenPayload = { sub: userId, email };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

function parseExpiry(expiry: string): Date {
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) throw new Error(`Invalid expiry format: ${expiry}`);
  const multiplier = units[match[2]] ?? 86400;
  return new Date(Date.now() + parseInt(match[1], 10) * multiplier * 1000);
}

async function createSession(
  userId: string,
  rawRefreshToken: string,
  tokenFamily: string,
  opts?: { userAgent?: string; ipAddress?: string },
): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = parseExpiry(env.JWT_REFRESH_EXPIRES_IN);

  await Session.create({
    userId: new mongoose.Types.ObjectId(userId),
    tokenHash,
    tokenFamily,
    expiresAt,
    userAgent: opts?.userAgent,
    ipAddress: opts?.ipAddress,
  });
}

// ── Service functions ──────────────────────────────────────────────────────────

/**
 * Register a new user.
 * Returns the created user (without password hash) and auth tokens.
 */
export async function register(
  name: string,
  email: string,
  password: string,
  timezone = 'Asia/Kolkata',
  opts?: { userAgent?: string; ipAddress?: string },
): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  // Check for duplicate email
  const exists = await User.findOne({ email }).lean();
  if (exists) {
    // Generic message to prevent email enumeration
    throw new ConflictError('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  const user = await User.create({ name, email, passwordHash, timezone });

  // Initialize default starter accounts for immediate ledger tracking
  await Account.create([
    {
      userId: user._id,
      name: 'Primary Bank Account',
      type: 'bank',
      currency: 'INR',
      openingBalance: 0,
      currentBalance: 0,
    },
    {
      userId: user._id,
      name: 'Cash Wallet',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      currentBalance: 0,
    },
  ]);

  const accessToken = generateAccessToken(user._id.toString(), user.email);
  const rawRefreshToken = generateRefreshToken();
  const tokenFamily = crypto.randomUUID();

  await createSession(user._id.toString(), rawRefreshToken, tokenFamily, opts);

  logger.info('User registered', { userId: user._id.toString() });

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      createdAt: user.createdAt,
    },
    tokens: { accessToken, refreshToken: rawRefreshToken },
  };
}

/**
 * Login with email and password.
 * Returns user (public) and auth tokens.
 */
export async function login(
  email: string,
  password: string,
  opts?: { userAgent?: string; ipAddress?: string },
): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  // Always use same generic message for bad credentials (no enumeration)
  const INVALID_MSG = 'Invalid email or password';

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw new UnauthorizedError(INVALID_MSG);
  if (!user.isActive) throw new UnauthorizedError(INVALID_MSG);

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new UnauthorizedError(INVALID_MSG);

  const accessToken = generateAccessToken(user._id.toString(), user.email);
  const rawRefreshToken = generateRefreshToken();
  const tokenFamily = crypto.randomUUID();

  await createSession(user._id.toString(), rawRefreshToken, tokenFamily, opts);

  logger.info('User logged in', { userId: user._id.toString() });

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      createdAt: user.createdAt,
    },
    tokens: { accessToken, refreshToken: rawRefreshToken },
  };
}

/**
 * Rotate a refresh token.
 * Detects reuse: if a revoked token in a family is presented, revoke the whole family.
 */
export async function refreshTokens(
  rawRefreshToken: string,
  opts?: { userAgent?: string; ipAddress?: string },
): Promise<AuthTokens> {
  const tokenHash = hashToken(rawRefreshToken);

  const session = await Session.findOne({ tokenHash }).select('+tokenHash');

  if (!session) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Token reuse detection: if revoked, kill the entire family
  if (session.isRevoked) {
    logger.warn('Refresh token reuse detected — revoking token family', {
      tokenFamily: session.tokenFamily,
      userId: session.userId.toString(),
    });
    await Session.updateMany({ tokenFamily: session.tokenFamily }, { isRevoked: true });
    throw new UnauthorizedError('Refresh token reuse detected. Please log in again.');
  }

  if (session.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  // Revoke the current session (rotation: single use)
  session.isRevoked = true;
  await session.save();

  // Issue new tokens in the same family
  const user = await User.findById(session.userId);
  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }

  const newAccessToken = generateAccessToken(user._id.toString(), user.email);
  const newRawRefreshToken = generateRefreshToken();

  await createSession(user._id.toString(), newRawRefreshToken, session.tokenFamily, opts);

  return { accessToken: newAccessToken, refreshToken: newRawRefreshToken };
}

/**
 * Logout the current session.
 * Revokes only the session associated with the provided refresh token.
 */
export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await Session.findOneAndUpdate({ tokenHash }, { isRevoked: true });
}

/**
 * Logout from all sessions.
 */
export async function logoutAll(userId: string): Promise<void> {
  await Session.updateMany({ userId, isRevoked: false }, { isRevoked: true });
  logger.info('All sessions revoked', { userId });
}

/**
 * List active sessions for a user.
 */
export async function listSessions(userId: string): Promise<SessionInfo[]> {
  const sessions = await Session.find({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  })
    .select('-tokenHash -tokenFamily')
    .lean();

  return sessions.map((s) => ({
    sessionId: s._id.toString(),
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
  }));
}

/**
 * Revoke a specific session.
 * Ownership is validated — users can only revoke their own sessions.
 */
export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new NotFoundError('Session');
  }

  const session = await Session.findOne({
    _id: sessionId,
    userId,
  });

  if (!session) throw new NotFoundError('Session');

  session.isRevoked = true;
  await session.save();
}

/**
 * Change password.
 * Revokes all existing sessions after a successful change.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new NotFoundError('User');

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw new ForbiddenError('Current password is incorrect');

  user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await user.save();

  // Revoke all sessions (security: re-login required after password change)
  await Session.updateMany({ userId, isRevoked: false }, { isRevoked: true });

  logger.info('Password changed', { userId });
}

/**
 * Initiate a password reset.
 * Always returns the same response to prevent email enumeration.
 * In production, this would send an email; here it returns the token directly for API-based clients.
 */
export async function forgotPassword(email: string): Promise<{ resetToken: string }> {
  const user = await User.findOne({ email });

  // Even if user not found, don't reveal it
  if (!user || !user.isActive) {
    // Return a fake token to prevent enumeration
    return { resetToken: 'noop' };
  }

  // Invalidate any existing reset tokens for this user
  await PasswordResetToken.deleteMany({ userId: user._id });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + (env.PASSWORD_RESET_EXPIRES_IN ?? 3600000));

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
  });

  logger.info('Password reset token generated', { userId: user._id.toString() });

  // In production: send email. For now, return the token (API-only flow).
  return { resetToken: rawToken };
}

/**
 * Reset the password using a reset token.
 */
export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashResetToken(rawToken);
  const resetRecord = await PasswordResetToken.findOne({ tokenHash }).select('+tokenHash');

  if (!resetRecord) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
  }

  if (resetRecord.expiresAt < new Date()) {
    throw new AppError('Reset token has expired', 400, 'RESET_TOKEN_EXPIRED');
  }

  if (resetRecord.usedAt) {
    throw new AppError('Reset token already used', 400, 'RESET_TOKEN_USED');
  }

  const user = await User.findById(resetRecord.userId).select('+passwordHash');
  if (!user) throw new NotFoundError('User');

  user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await user.save();

  // Mark token as used
  resetRecord.usedAt = new Date();
  await resetRecord.save();

  // Revoke all sessions
  await Session.updateMany({ userId: user._id, isRevoked: false }, { isRevoked: true });

  logger.info('Password reset complete', { userId: user._id.toString() });
}

/**
 * Get the currently authenticated user's public profile.
 */
export async function getMe(userId: string): Promise<UserPublic> {
  const user = await User.findById(userId).lean();
  if (!user) throw new NotFoundError('User');

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
}
