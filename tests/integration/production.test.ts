import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { logger } from '../../src/utils/logger';

describe('Phase 12: Production Readiness & Security Hardening', () => {
  const app = createApp();

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env['MONGODB_URI'] as string);
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('1. Sensitive Data Redaction in Logging', () => {
    it('redacts sensitive fields like passwords, tokens, and api keys in log metadata', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('Test login payload logging', {
        email: 'user@example.com',
        password: 'PlainTextPassword123!',
        refreshToken: 'raw-refresh-token-value',
        accessToken: 'raw-jwt-access-token',
        apiKey: 'sk-secret-openai-api-key',
        nested: {
          passwordHash: '$2a$12$hashvalue',
          safeField: 'safe data',
        },
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedJsonStr = consoleErrorSpy.mock.calls[0]?.[0];
      expect(loggedJsonStr).toBeDefined();

      const parsed = JSON.parse(loggedJsonStr as string);
      expect(parsed.meta.email).toBe('user@example.com');
      expect(parsed.meta.password).toBe('[REDACTED]');
      expect(parsed.meta.refreshToken).toBe('[REDACTED]');
      expect(parsed.meta.accessToken).toBe('[REDACTED]');
      expect(parsed.meta.apiKey).toBe('[REDACTED]');
      expect(parsed.meta.nested.passwordHash).toBe('[REDACTED]');
      expect(parsed.meta.nested.safeField).toBe('safe data');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('2. Correlation ID (X-Request-Id) Propagation', () => {
    it('generates a new UUID when client does not supply X-Request-Id', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect((res.headers['x-request-id'] as string).length).toBeGreaterThan(10);
    });

    it('propagates the incoming X-Request-Id when supplied by client', async () => {
      const customId = 'client-correlation-id-998877';
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Request-Id', customId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customId);
    });
  });

  describe('3. Production Security Headers (Helmet)', () => {
    it('includes essential security headers to prevent sniffing and clickjacking', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
      // Express default x-powered-by header must be removed by Helmet
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('4. Zero Stack-Trace Leakage in Production Error Responses', () => {
    it('never exposes stack trace or internal implementation details on 404', async () => {
      const res = await request(app).get('/api/v1/non-existent-route-for-testing');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
      expect(res.body.stack).toBeUndefined();
      expect(res.body.error.stack).toBeUndefined();
    });

    it('never exposes stack traces on invalid validation errors', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: '1' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.stack).toBeUndefined();
      expect(res.body.error.stack).toBeUndefined();
    });
  });

  describe('5. Payload Size Limit Enforcement', () => {
    it('rejects JSON payloads exceeding the configured size limit (> 10kb)', async () => {
      // 15kb payload
      const largePayload = {
        data: 'A'.repeat(15 * 1024),
      };

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(largePayload);

      // Express body-parser returns 413 Payload Too Large
      expect(res.status).toBe(413);
    });
  });

  describe('6. Liveness and Readiness Probes', () => {
    it('GET /api/v1/health returns ok status with timestamp', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });

    it('GET /api/v1/ready returns ready status when MongoDB connection is active', async () => {
      const res = await request(app).get('/api/v1/ready');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.database).toBe('connected');
    });
  });
});
