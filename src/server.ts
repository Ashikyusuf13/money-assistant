import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

const app = createApp();
let server: ReturnType<typeof app.listen>;

async function start(): Promise<void> {
  try {
    await connectDatabase();

    server = app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`🚀 ${env.APP_NAME} listening on 0.0.0.0:${env.PORT}`, {
        port: env.PORT,
        env: env.NODE_ENV,
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  }
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal} — graceful shutdown started`);

  if (server) {
    server.close(async (err) => {
      if (err) {
        logger.error('Error closing HTTP server', { error: err });
        process.exit(1);
      }
      logger.info('HTTP server closed');
      try {
        const { disconnectDatabase } = await import('./config/database');
        await disconnectDatabase();
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (dbErr) {
        logger.error('Error disconnecting database', { error: dbErr });
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — shutting down', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection — shutting down', { reason: String(reason) });
  process.exit(1);
});

void start();
