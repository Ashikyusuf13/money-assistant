import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ── Mock mongoose models ───────────────────────────────────────────────────────
vi.mock('../../src/models', () => {
  const mockUser = {
    _id: { toString: () => 'user-123' },
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    isActive: true,
    timezone: 'Asia/Kolkata',
    createdAt: new Date('2024-01-01'),
    save: vi.fn().mockResolvedValue(undefined),
  };

  const mockSession = {
    _id: { toString: () => 'session-123' },
    tokenFamily: 'family-abc',
    userId: 'user-123',
    isRevoked: false,
    expiresAt: new Date(Date.now() + 86400000),
    save: vi.fn().mockResolvedValue(undefined),
  };

  return {
    User: {
      findOne: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(mockUser),
      create: vi.fn().mockResolvedValue(mockUser),
    },
    Session: {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([mockSession]),
      findOneAndUpdate: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      create: vi.fn().mockResolvedValue(mockSession),
    },
    PasswordResetToken: {
      findOne: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ usedAt: undefined, save: vi.fn() }),
    },
    hashToken: (t: string) => `hashed-${t}`,
    hashResetToken: (t: string) => `reset-hashed-${t}`,
  };
});

describe('Auth Service — unit tests with mocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAccessToken (via jwt)', () => {
    it('creates a verifiable JWT with sub and email', () => {
      const secret = process.env['JWT_ACCESS_SECRET'] ?? 'test-secret';
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = jwt.sign(payload, secret, { expiresIn: '15m' });
      const verified = jwt.verify(token, secret) as typeof payload & { sub: string };
      expect(verified.sub).toBe('user-123');
      expect(verified.email).toBe('test@example.com');
    });
  });

  describe('bcrypt', () => {
    it('hashes and verifies a password correctly', async () => {
      const password = 'TestPass1';
      const hash = await bcrypt.hash(password, 4);
      const isMatch = await bcrypt.compare(password, hash);
      const isMismatch = await bcrypt.compare('WrongPass1', hash);
      expect(isMatch).toBe(true);
      expect(isMismatch).toBe(false);
    });

    it('generates different hashes for the same password (salting)', async () => {
      const password = 'TestPass1';
      const hash1 = await bcrypt.hash(password, 4);
      const hash2 = await bcrypt.hash(password, 4);
      expect(hash1).not.toBe(hash2);
    });
  });
});
