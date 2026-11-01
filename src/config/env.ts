import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  APP_NAME: z.string().default('money-assistant-api'),

  // MongoDB
  MONGODB_URI: z
    .string()
    .default(
      'mongodb+srv://ashik13ay_db_user:UFlkHx8FFWKb3oIM@cluster0.m4byhgo.mongodb.net/money_assistant?retryWrites=true&w=majority',
    ),
  MONGODB_URI_TEST: z.string().optional(),

  // JWT
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default('ashikjwtkeynew_secure_jwt_access_secret_key_2026'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32)
    .default('ashikjwtkeynewrefreshkey_secure_jwt_refresh_secret_key_2026'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(14).default(12),

  // CORS
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3000,http://localhost:8081,exp://localhost:8081,https://money-assistant-backend.vercel.app',
    ),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  // OpenAI
  OPENAI_API: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  OPENAI_MAX_TOKENS: z.coerce.number().int().positive().default(1000),

  // Password reset
  PASSWORD_RESET_EXPIRES_IN: z.coerce.number().int().positive().default(3600000),
  PASSWORD_RESET_SECRET: z.string().min(16).optional().default('passkeyreset_secure_reset_token_secret_key_2026'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('⚠️ Environment variables warning, using defaults:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    // Parse with defaults rather than abruptly exiting in serverless
    return envSchema.parse({});
  }
  return result.data;
}

export const env = validateEnv();
export type Env = typeof env;
