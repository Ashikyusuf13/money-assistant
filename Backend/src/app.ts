import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  globalRateLimiter,
} from './middleware';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import transactionRouter from './routes/transaction';
import salaryRouter from './routes/salary';
import dashboardRouter from './routes/dashboard';
import budgetRouter from './routes/budget';
import goalRouter from './routes/goal';
import reportRouter from './routes/report';
import accountRouter from './routes/account';
import aiRouter from './routes/ai';
import docsRouter from './routes/docs';

export function createApp(): Application {
  const app: Application = express();

  // ── Database connection middleware (for Serverless / Vercel execution) ──────
  app.use(async (_req, _res, next) => {
    try {
      await connectDatabase();
      next();
    } catch (err) {
      next(err);
    }
  });

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // allow requests with no origin (mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin '${origin}' not allowed`));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      credentials: true,
    }),
  );

  // ── Request parsing ────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ── Request logging & ID injection ────────────────────────────────────────
  app.use(requestLogger);

  // ── Global rate limiting ──────────────────────────────────────────────────
  app.use(globalRateLimiter);

  // ── Root Endpoint ─────────────────────────────────────────────────────────
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      app: 'Money Assistant API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/transactions', transactionRouter);
  app.use('/api/v1/salary', salaryRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/budgets', budgetRouter);
  app.use('/api/v1/goals', goalRouter);
  app.use('/api/v1/accounts', accountRouter);
  app.use('/api/v1/reports', reportRouter);
  app.use('/api/v1/assistant', aiRouter);
  app.use('/api/v1/docs', docsRouter);

  // ── 404 catch-all ─────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── Centralized error handler (must be last) ──────────────────────────────
  app.use(errorHandler);

  return app;
}

const defaultApp = createApp();
export default defaultApp;
