import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';

const app = createApp();

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env['MONGODB_URI'] as string);
  });

  afterAll(async () => {
    // Clean up test data
    await mongoose.connection.db?.collection('users').deleteMany({ email: /test-auth@/ });
    await mongoose.connection.db?.collection('sessions').deleteMany({});
    await mongoose.connection.db?.collection('passwordresettokens').deleteMany({});
    await mongoose.disconnect();
  });

  // Unique email per test run
  const testEmail = `test-auth-${Date.now()}@example.com`;
  const testPassword = 'TestPass1!';
  let refreshToken = '';
  let accessToken = '';

  // ── Registration ─────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('registers a new user successfully', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test User',
        email: testEmail,
        password: testPassword,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      refreshToken = res.body.data.tokens.refreshToken as string;
      accessToken = res.body.data.tokens.accessToken as string;
    });

    it('rejects duplicate email with 409', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Duplicate',
        email: testEmail,
        password: testPassword,
      });
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects weak password with 400', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Weak',
        email: `weak-${Date.now()}@example.com`,
        password: 'weak',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects missing email with 400', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test',
        password: testPassword,
      });
      expect(res.status).toBe(400);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });
      expect(res.status).toBe(200);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      refreshToken = res.body.data.tokens.refreshToken as string;
      accessToken = res.body.data.tokens.accessToken as string;
    });

    it('rejects wrong password with 401', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: 'WrongPass1!',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects non-existent email with 401 (generic message)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'ghost@example.com',
        password: testPassword,
      });
      expect(res.status).toBe(401);
      // Response should be same generic message (no enumeration)
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  // ── Get Me ────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('returns current user with valid access token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testEmail);
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('returns 401 without auth header', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });

  // ── Refresh Token ─────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('issues new tokens with a valid refresh token', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // Rotate the token for subsequent tests
      refreshToken = res.body.data.refreshToken as string;
      accessToken = res.body.data.accessToken as string;
    });

    it('rejects an already-used refresh token with 401 (reuse detection)', async () => {
      // Get a fresh refresh token
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });
      const tempToken = loginRes.body.data.tokens.refreshToken as string;

      // Use it once
      const firstRefresh = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tempToken });
      expect(firstRefresh.status).toBe(200);

      // Try to reuse the same token → should detect reuse
      const secondRefresh = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tempToken });
      expect(secondRefresh.status).toBe(401);
    });

    it('rejects invalid refresh token with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'fake-token-abc' });
      expect(res.status).toBe(401);
    });
  });

  // ── Sessions ──────────────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/sessions', () => {
    it('lists active sessions for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('logs out the current session', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken });
      expect(res.status).toBe(200);

      // The refresh token should now be invalid
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });
  });

  // ── Change Password ───────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/change-password', () => {
    it('changes password with correct current password', async () => {
      // Login fresh
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });
      const freshAccessToken = loginRes.body.data.tokens.accessToken as string;

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${freshAccessToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'NewPass2!',
        });
      expect(res.status).toBe(200);

      // Old password should no longer work
      const loginOld = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });
      expect(loginOld.status).toBe(401);

      // Restore for future tests
      const loginNew = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: 'NewPass2!',
      });
      expect(loginNew.status).toBe(200);
      accessToken = loginNew.body.data.tokens.accessToken as string;
    });

    it('rejects wrong current password with 403', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongOld1!',
          newPassword: 'NewPass3!',
        });
      expect(res.status).toBe(403);
    });
  });

  // ── Logout All ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout-all', () => {
    it('revokes all sessions for the user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ── Forgot / Reset Password ───────────────────────────────────────────────────

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns success with same message regardless of email existence', async () => {
      const res1 = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testEmail });
      const res2 = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.data.message).toBe(res2.body.data.message);
    });
  });
});
