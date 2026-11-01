import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  revokeSessionSchema,
} from '../validators/auth.validators';

const router = Router();

// Public routes (rate-limited)
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authRateLimiter, validate(refreshTokenSchema), authController.refreshTokens);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Logout (requires refresh token in body, no access token needed)
router.post('/logout', validate(refreshTokenSchema), authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/sessions', authenticate, authController.listSessions);
router.delete('/sessions/:sessionId', authenticate, validate(revokeSessionSchema), authController.revokeSession);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
