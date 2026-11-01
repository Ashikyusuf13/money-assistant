import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { Account, Salary, Transaction } from '../../src/models';

const app = createApp();

describe('Salary and Income APIs Integration Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let userAAccountId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env['MONGODB_URI'] as string);
    }

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'Salary Test User A',
      email: `salary-user-a-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userAToken = resA.body.data.tokens.accessToken;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'Salary Test User B',
      email: `salary-user-b-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userBToken = resB.body.data.tokens.accessToken;
    userBId = resB.body.data.user.id;

    // Create Account for User A
    const acc = await Account.create({
      userId: new mongoose.Types.ObjectId(userAId),
      name: 'Salary Account',
      type: 'bank',
      openingBalance: 500000, // 5,000 INR
    });
    userAAccountId = acc._id.toString();
  });

  afterAll(async () => {
    await Salary.deleteMany({
      userId: { $in: [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)] },
    });
    await Account.deleteMany({
      userId: { $in: [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)] },
    });
    await Transaction.deleteMany({
      userId: { $in: [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)] },
    });
    await mongoose.connection.db?.collection('users').deleteMany({
      _id: { $in: [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)] },
    });
    await mongoose.connection.db?.collection('sessions').deleteMany({
      userId: { $in: [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)] },
    });
    await mongoose.disconnect();
  });

  // ── Authentication Check ─────────────────────────────────────────────────────

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/salary');
    expect(res.status).toBe(401);
  });

  // ── Salary Setup ─────────────────────────────────────────────────────────────

  describe('POST & GET /api/v1/salary', () => {
    it('returns null salary when user has not configured salary yet', async () => {
      const res = await request(app)
        .get('/api/v1/salary')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.salary).toBeNull();
    });

    it('sets up base monthly salary successfully', async () => {
      const res = await request(app)
        .post('/api/v1/salary')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          baseMonthlySalary: 10000000, // 100,000 INR
          effectiveDate: '2026-01-01T00:00:00.000Z',
          currency: 'INR',
          notes: 'Initial joining base compensation',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.salary.baseMonthlySalary).toBe(10000000);
      expect(res.body.data.salary.currency).toBe('INR');
      expect(res.body.data.salary.revisions).toHaveLength(0);
    });

    it('retrieves configured salary profile', async () => {
      const res = await request(app)
        .get('/api/v1/salary')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.salary.baseMonthlySalary).toBe(10000000);
    });
  });

  // ── Salary Revisions ─────────────────────────────────────────────────────────

  describe('POST /api/v1/salary/revisions', () => {
    it('records a revision and does NOT generate transactions or modify balances', async () => {
      const initialTxCount = await Transaction.countDocuments({
        userId: new mongoose.Types.ObjectId(userAId),
      });
      const initialAcc = await Account.findById(userAAccountId);
      const initialBalance = initialAcc?.currentBalance;

      // Add increment from 100,000 to 120,000 INR (12,000,000 paise)
      const res = await request(app)
        .post('/api/v1/salary/revisions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          revisedSalary: 12000000,
          effectiveDate: '2026-06-01T00:00:00.000Z',
          notes: 'Mid-year performance promotion',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.salary.baseMonthlySalary).toBe(12000000);
      expect(res.body.data.salary.revisions).toHaveLength(1);
      expect(res.body.data.salary.revisions[0].previousSalary).toBe(10000000);
      expect(res.body.data.salary.revisions[0].revisedSalary).toBe(12000000);

      // CRITICAL DOMAIN CHECK: No transaction created, balance untouched!
      const afterTxCount = await Transaction.countDocuments({
        userId: new mongoose.Types.ObjectId(userAId),
      });
      expect(afterTxCount).toBe(initialTxCount);

      const afterAcc = await Account.findById(userAAccountId);
      expect(afterAcc?.currentBalance).toBe(initialBalance);
    });

    it('records a second revision', async () => {
      // Add second increment to 150,000 INR (15,000,000 paise)
      const res = await request(app)
        .post('/api/v1/salary/revisions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          revisedSalary: 15000000,
          effectiveDate: '2026-10-01T00:00:00.000Z',
          notes: 'Year-end market adjustment',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.salary.baseMonthlySalary).toBe(15000000);
      expect(res.body.data.salary.revisions).toHaveLength(2);
      expect(res.body.data.salary.revisions[1].previousSalary).toBe(12000000);
      expect(res.body.data.salary.revisions[1].revisedSalary).toBe(15000000);
    });
  });

  // ── Salary Comparison & Growth ───────────────────────────────────────────────

  describe('GET /api/v1/salary/comparison', () => {
    it('computes accurate percentage and absolute salary increments', async () => {
      const res = await request(app)
        .get('/api/v1/salary/comparison')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const comparison = res.body.data.comparison;

      expect(comparison.currentSalary).toBe(15000000);
      expect(comparison.previousSalary).toBe(12000000);
      expect(comparison.initialSalary).toBe(10000000);

      // Latest increase: 15,000,000 - 12,000,000 = 3,000,000 paise (30,000 INR)
      expect(comparison.absoluteIncreasePaise).toBe(3000000);
      // (3,000,000 / 12,000,000) * 100 = 25%
      expect(comparison.percentageIncrease).toBe(25);

      // Lifetime growth: 15,000,000 - 10,000,000 = 5,000,000 paise (50,000 INR)
      expect(comparison.totalLifetimeGrowthPaise).toBe(5000000);
      // (5,000,000 / 10,000,000) * 100 = 50%
      expect(comparison.totalLifetimeGrowthPercentage).toBe(50);
      expect(comparison.totalRevisions).toBe(2);
    });
  });

  // ── Salary Credits & Actual Disbursements ────────────────────────────────────

  describe('POST & GET /api/v1/salary/credits', () => {
    it('records an actual salary credit using current base salary and credits the account', async () => {
      // Current base salary is 150,000 INR (15,000,000 paise)
      // Account balance before: 5,000 INR (500,000 paise)
      const res = await request(app)
        .post('/api/v1/salary/credits')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          accountId: userAAccountId,
          description: 'October 2026 Salary Credit',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.amount).toBe(15000000);
      expect(res.body.data.transaction.category).toBe('salary');
      expect(res.body.data.transaction.type).toBe('income');

      // Account balance after: 500,000 + 15,000,000 = 15,500,000 paise
      const acc = await Account.findById(userAAccountId);
      expect(acc?.currentBalance).toBe(15500000);
    });

    it('records a salary credit with custom amount (e.g. including performance bonus)', async () => {
      const res = await request(app)
        .post('/api/v1/salary/credits')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          accountId: userAAccountId,
          amount: 18000000, // 180,000 INR
          description: 'November 2026 Salary + Diwali Bonus',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.transaction.amount).toBe(18000000);

      // Account balance: 15,500,000 + 18,000,000 = 33,500,000 paise
      const acc = await Account.findById(userAAccountId);
      expect(acc?.currentBalance).toBe(33500000);
    });

    it('retrieves the salary credits history', async () => {
      const res = await request(app)
        .get('/api/v1/salary/credits')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.credits).toHaveLength(2);
      expect(res.body.data.credits[0].category).toBe('salary');
      expect(res.body.data.credits[1].category).toBe('salary');
    });

    it('does not leak User A salary credits to User B', async () => {
      const res = await request(app)
        .get('/api/v1/salary/credits')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.credits).toHaveLength(0);
    });
  });
});
