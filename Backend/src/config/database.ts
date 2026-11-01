import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

const MONGODB_OPTIONS: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
};

export async function connectDatabase(): Promise<void> {
  const uri = env.NODE_ENV === 'test'
    ? (env.MONGODB_URI_TEST ?? env.MONGODB_URI)
    : env.MONGODB_URI;

  try {
    await mongoose.connect(uri, MONGODB_OPTIONS);
    logger.info('✅ MongoDB connected', { uri: uri.replace(/\/\/[^@]+@/, '//***@') });
  } catch (error) {
    logger.error('❌ MongoDB connection failed', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB runtime error', { error: err });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected unexpectedly');
});
