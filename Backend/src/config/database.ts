import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

const MONGODB_OPTIONS: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 1,
};

let cachedPromise: Promise<typeof mongoose> | null = null;

export async function connectDatabase(): Promise<void> {
  // 1 = connected, 2 = connecting
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2 && cachedPromise) {
    await cachedPromise;
    return;
  }

  const uri = env.NODE_ENV === 'test'
    ? (env.MONGODB_URI_TEST ?? env.MONGODB_URI)
    : env.MONGODB_URI;

  try {
    cachedPromise = mongoose.connect(uri, MONGODB_OPTIONS);
    await cachedPromise;
    logger.info('✅ MongoDB connected', { uri: uri.replace(/\/\/[^@]+@/, '//***@') });
  } catch (error) {
    cachedPromise = null;
    logger.error('❌ MongoDB connection failed', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  cachedPromise = null;
  logger.info('MongoDB disconnected');
}

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB runtime error', { error: err });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected unexpectedly');
});
