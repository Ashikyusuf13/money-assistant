import { z } from 'zod';

// ── Register ───────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(1, 'Name must not be empty')
      .max(100, 'Name must be at most 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
    timezone: z.string().optional().default('Asia/Kolkata'),
  }),
});

// ── Login ──────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    password: z.string({ required_error: 'Password is required' }).min(1),
  }),
});

// ── Refresh Token ──────────────────────────────────────────────────────────────

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({ required_error: 'Refresh token is required' })
      .min(1, 'Refresh token is required'),
  }),
});

// ── Revoke Session ─────────────────────────────────────────────────────────────

export const revokeSessionSchema = z.object({
  params: z.object({
    sessionId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid session ID'),
  }),
});

// ── Change Password ────────────────────────────────────────────────────────────

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
  }),
});

// ── Forgot Password ────────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
  }),
});

// ── Reset Password ─────────────────────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string({ required_error: 'Reset token is required' }).min(1),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
  }),
});

// ── Inferred types ─────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
