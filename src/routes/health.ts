import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';

const router = Router();

/** GET /health — liveness probe */
router.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'ok',
    app: env.APP_NAME,
    timestamp: new Date().toISOString(),
  });
});

/** GET /ready — readiness probe (checks MongoDB) */
router.get('/ready', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected
  const isReady = dbState === 1;

  if (isReady) {
    sendSuccess(res, {
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database is not connected',
        database: { state: dbState },
      },
    });
  }
});

export default router;
