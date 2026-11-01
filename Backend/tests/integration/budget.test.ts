import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { Budget, Transaction } from '../../src/models';

const app = createApp();

describe('Budget APIs and Rule-Based Alerts Integration Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env['MONGODB_URI'] as string);
    }

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'Budget User A',
      email: `budget-user-a-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userAToken = resA.body.data.tokens.accessToken;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'Budget User B',
      email: `budget-user-b-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userBToken = resB.body.data.tokens.accessToken;
    userBId = resB.body.data.user.id;
  });

  afterAll(async () => {
    const ids = [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)];
    await Budget.deleteMany({ userId: { $in: ids } });
    await Transaction.deleteMany({ userId: { $in: ids } });
    await mongoose.connection.db?.collection('users').deleteMany({ _id: { $in: ids } });
    await mongoose.connection.db?.collection('sessions').deleteMany({ userId: { $in: ids } });
    await mongoose.disconnect();
  });

  let createdBudgetId: string;

  // ── Authentication Check ─────────────────────────────────────────────────────

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/budgets');
    expect(res.status).toBe(401);
  });

  // ── Create Budget ────────────────────────────────────────────────────────────

  describe('POST /api/v1/budgets', () => {
    it('creates a monthly category budget', async () => {
      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          category: 'groceries',
          amount: 2000000, // 20,000 INR
          month: '2026-10',
          alertThreshold: 80,
          notes: 'Groceries limit for festive month',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.budget.category).toBe('groceries');
      expect(res.body.data.budget.amount).toBe(2000000);
      expect(res.body.data.budget.alertThreshold).toBe(80);
      createdBudgetId = res.body.data.budget._id;
    });

    it('rejects duplicate budget for same category and month with 409', async () => {
      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          category: 'groceries',
          amount: 2500000,
          month: '2026-10',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid month format with 400', async () => {
      const res = await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          category: 'utilities',
          amount: 500000,
          month: '2026-15',
        });

      expect(res.status).toBe(400);
    });
  });

  // ── List & Utilization ───────────────────────────────────────────────────────

  describe('GET /api/v1/budgets', () => {
    beforeAll(async () => {
      // Add transactions to groceries in October 2026
      // Expense: 15,000 INR
      await Transaction.create({
        userId: new mongoose.Types.ObjectId(userAId),
        type: 'expense',
        amount: 1500000,
        category: 'groceries',
        description: 'Supermarket visit',
        date: new Date('2026-10-05T10:00:00.000Z'),
      });

      // Refund: 3,000 INR
      await Transaction.create({
        userId: new mongoose.Types.ObjectId(userAId),
        type: 'refund',
        amount: 300000,
        category: 'groceries',
        description: 'Returned items refund',
        date: new Date('2026-10-08T12:00:00.000Z'),
      });
    });

    it('calculates real-time net spend and utilization percentage factoring in refunds', async () => {
      const res = await request(app)
        .get('/api/v1/budgets?month=2026-10')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const budget = res.body.data.budgets.find(
        (b: { category: string }) => b.category === 'groceries',
      );
      expect(budget).toBeDefined();

      // Net spend = 15,000 - 3,000 = 12,000 INR = 1,200,000 paise
      expect(budget.spentPaise).toBe(1200000);
      // Remaining = 20,000 - 12,000 = 8,000 INR = 800,000 paise
      expect(budget.remainingPaise).toBe(800000);
      // Utilization = (12,000 / 20,000) * 100 = 60%
      expect(budget.utilizationPercentage).toBe(60);
      expect(budget.isAlertTriggered).toBe(false);
      expect(budget.isExceeded).toBe(false);
    });
  });

  // ── Rule-Based Alerts ────────────────────────────────────────────────────────

  describe('GET /api/v1/budgets/alerts', () => {
    beforeAll(async () => {
      // 1. Warning budget: Dining (limit: 10,000 INR, threshold: 70%, spend: 7,500 INR -> 75% -> warning)
      await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          category: 'dining',
          amount: 1000000,
          month: '2026-10',
          alertThreshold: 70,
        });

      await Transaction.create({
        userId: new mongoose.Types.ObjectId(userAId),
        type: 'expense',
        amount: 750000,
        category: 'dining',
        description: 'Fine dining',
        date: new Date('2026-10-12T19:00:00.000Z'),
      });

      // 2. Critical/Exceeded budget: Entertainment (limit: 5,000 INR, spend: 6,000 INR -> 120% -> critical)
      await request(app)
        .post('/api/v1/budgets')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          category: 'entertainment',
          amount: 500000,
          month: '2026-10',
          alertThreshold: 80,
        });

      await Transaction.create({
        userId: new mongoose.Types.ObjectId(userAId),
        type: 'expense',
        amount: 600000,
        category: 'entertainment',
        description: 'Concert tickets',
        date: new Date('2026-10-14T20:00:00.000Z'),
      });
    });

    it('returns rule-based alert items with correct severity levels', async () => {
      const res = await request(app)
        .get('/api/v1/budgets/alerts?month=2026-10')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const alerts = res.body.data.alerts;

      // Expect 2 alerts (dining warning, entertainment critical)
      // groceries at 60% with threshold 80% should NOT be in alerts
      expect(alerts).toHaveLength(2);

      const diningAlert = alerts.find((a: { category: string }) => a.category === 'dining');
      expect(diningAlert.severity).toBe('warning');
      expect(diningAlert.utilizationPercentage).toBe(75);
      expect(diningAlert.isExceeded).toBe(false);

      const entAlert = alerts.find((a: { category: string }) => a.category === 'entertainment');
      expect(entAlert.severity).toBe('critical');
      expect(entAlert.utilizationPercentage).toBe(120);
      expect(entAlert.isExceeded).toBe(true);
    });
  });

  // ── Single Budget Detail ─────────────────────────────────────────────────────

  describe('GET /api/v1/budgets/:id', () => {
    it('returns budget detail including its associated transactions', async () => {
      const res = await request(app)
        .get(`/api/v1/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.budget.category).toBe('groceries');
      expect(res.body.data.budget.transactions).toHaveLength(2);
    });

    it('returns 404 when User B tries to view User A budget', async () => {
      const res = await request(app)
        .get(`/api/v1/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Update Budget ────────────────────────────────────────────────────────────

  describe('PUT /api/v1/budgets/:id', () => {
    it('updates budget limit and recalculates utilization', async () => {
      // Increase groceries limit from 20,000 INR to 24,000 INR (2,400,000 paise)
      // Net spend is 12,000 INR -> new utilization is (12,000 / 24,000) * 100 = 50%
      const res = await request(app)
        .put(`/api/v1/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          amount: 2400000,
          alertThreshold: 85,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.budget.budgetAmount).toBe(2400000);
      expect(res.body.data.budget.remainingPaise).toBe(1200000);
      expect(res.body.data.budget.utilizationPercentage).toBe(50);
      expect(res.body.data.budget.alertThreshold).toBe(85);
    });

    it('returns 404 when User B tries to update User A budget', async () => {
      const res = await request(app)
        .put(`/api/v1/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          amount: 5000000,
        });

      expect(res.status).toBe(404);
    });
  });

  // ── Delete Budget ────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/budgets/:id', () => {
    it('deletes a budget successfully', async () => {
      const res = await request(app)
        .delete(`/api/v1/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify direct GET returns 404
      const getRes = await request(app)
        .get(`/api/v1/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(getRes.status).toBe(404);
    });
  });
});
