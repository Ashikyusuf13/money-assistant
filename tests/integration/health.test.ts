import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';

describe('Health Endpoints', () => {
  const app = createApp();

  beforeAll(async () => {
    await mongoose.connect(process.env['MONGODB_URI'] as string);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('GET /api/v1/health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.timestamp).toBeDefined();
    });

    it('includes x-request-id header in response', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.headers['x-request-id']).toBeDefined();
    });
  });

  describe('GET /api/v1/ready', () => {
    it('returns 200 when database is connected', async () => {
      const res = await request(app).get('/api/v1/ready');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
    });
  });

  describe('404 handler', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });

  describe('Security headers', () => {
    it('includes Helmet security headers', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });
});
