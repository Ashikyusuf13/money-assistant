import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { Account, Goal, GoalContribution, Transaction } from '../../src/models';

const app = createApp();

describe('Savings Goals APIs Integration Tests', () => {
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
      name: 'Goal User A',
      email: `goal-user-a-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userAToken = resA.body.data.tokens.accessToken;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'Goal User B',
      email: `goal-user-b-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userBToken = resB.body.data.tokens.accessToken;
    userBId = resB.body.data.user.id;

    // Account for User A
    const acc = await Account.create({
      userId: new mongoose.Types.ObjectId(userAId),
      name: 'Savings Source Account',
      type: 'bank',
      openingBalance: 10000000, // 100,000 INR
    });
    userAAccountId = acc._id.toString();
  });

  afterAll(async () => {
    const ids = [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)];
    await Goal.deleteMany({ userId: { $in: ids } });
    await GoalContribution.deleteMany({ userId: { $in: ids } });
    await Account.deleteMany({ userId: { $in: ids } });
    await Transaction.deleteMany({ userId: { $in: ids } });
    await mongoose.connection.db?.collection('users').deleteMany({ _id: { $in: ids } });
    await mongoose.connection.db?.collection('sessions').deleteMany({ userId: { $in: ids } });
    await mongoose.disconnect();
  });

  let createdGoalId: string;

  // ── Authentication Check ─────────────────────────────────────────────────────

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/goals');
    expect(res.status).toBe(401);
  });

  // ── Create Goal ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/goals', () => {
    it('creates a new savings goal with pace metrics', async () => {
      // 100,000 INR target, target date 12 months in future
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const res = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Emergency Fund',
          targetAmount: 10000000, // 100,000 INR
          targetDate: futureDate.toISOString(),
          priority: 'high',
          category: 'safety_net',
          notes: '6 months emergency reserve',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const goal = res.body.data.goal;
      expect(goal.name).toBe('Emergency Fund');
      expect(goal.targetAmount).toBe(10000000);
      expect(goal.currentAmount).toBe(0);
      expect(goal.remainingAmount).toBe(10000000);
      expect(goal.percentage).toBe(0);
      expect(goal.isCompleted).toBe(false);
      expect(goal.monthsRemaining).toBeGreaterThanOrEqual(11);
      expect(goal.requiredMonthlyContributionPaise).toBeGreaterThan(0);
      createdGoalId = goal.id;
    });
  });

  // ── List Goals ───────────────────────────────────────────────────────────────

  describe('GET /api/v1/goals', () => {
    it('lists user goals with status filter', async () => {
      const res = await request(app)
        .get('/api/v1/goals?status=active')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.goals.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.goals[0].status).toBe('active');
    });

    it('isolates user goals: User B receives empty list', async () => {
      const res = await request(app)
        .get('/api/v1/goals')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.goals).toHaveLength(0);
    });
  });

  // ── Contributions and Withdrawals ────────────────────────────────────────────

  describe('POST /api/v1/goals/:id/contributions', () => {
    it('records contribution, updates goal progress, and debits source account', async () => {
      // Balance before: 100,000 INR (10,000,000 paise)
      // Contribution: 40,000 INR (4,000,000 paise)
      const res = await request(app)
        .post(`/api/v1/goals/${createdGoalId}/contributions`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'contribution',
          amount: 4000000,
          fromAccountId: userAAccountId,
          notes: 'Initial allocation from monthly salary',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const goal = res.body.data.goal;
      expect(goal.currentAmount).toBe(4000000);
      expect(goal.remainingAmount).toBe(6000000);
      expect(goal.percentage).toBe(40);
      expect(goal.isCompleted).toBe(false);

      // Verify funding account debited: 100,000 - 40,000 = 60,000 INR = 6,000,000 paise
      const acc = await Account.findById(userAAccountId);
      expect(acc?.currentBalance).toBe(6000000);

      // Verify transfer transaction created with category savings_transfer (NOT an expense)
      const tx = await Transaction.findOne({
        userId: new mongoose.Types.ObjectId(userAId),
        category: 'savings_transfer',
      });
      expect(tx).toBeDefined();
      expect(tx?.type).toBe('transfer');
      expect(tx?.amount).toBe(4000000);
    });

    it('auto-completes goal when contributions meet target amount', async () => {
      // Remaining is 6,000,000 paise. Contribute 6,000,000 paise to hit 100%.
      const res = await request(app)
        .post(`/api/v1/goals/${createdGoalId}/contributions`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'contribution',
          amount: 6000000,
          fromAccountId: userAAccountId,
          notes: 'Final boost from bonus',
        });

      expect(res.status).toBe(201);
      const goal = res.body.data.goal;
      expect(goal.currentAmount).toBe(10000000);
      expect(goal.remainingAmount).toBe(0);
      expect(goal.percentage).toBe(100);
      expect(goal.status).toBe('completed');
      expect(goal.isCompleted).toBe(true);
    });

    it('re-opens goal to active status upon withdrawal below target', async () => {
      // Withdraw 2,000,000 paise (20,000 INR)
      const res = await request(app)
        .post(`/api/v1/goals/${createdGoalId}/contributions`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'withdrawal',
          amount: 2000000,
          fromAccountId: userAAccountId,
          notes: 'Emergency medical withdrawal',
        });

      expect(res.status).toBe(201);
      const goal = res.body.data.goal;
      expect(goal.currentAmount).toBe(8000000);
      expect(goal.remainingAmount).toBe(2000000);
      expect(goal.percentage).toBe(80);
      expect(goal.status).toBe('active');
      expect(goal.isCompleted).toBe(false);

      // Verify funding account was credited with 20,000 INR
      const acc = await Account.findById(userAAccountId);
      expect(acc?.currentBalance).toBe(2000000); // 0 + 2,000,000
    });

    it('rejects withdrawal exceeding accumulated goal balance with 400', async () => {
      // Current accumulated is 8,000,000. Try withdrawing 9,000,000.
      const res = await request(app)
        .post(`/api/v1/goals/${createdGoalId}/contributions`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'withdrawal',
          amount: 9000000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Goal Details & History ───────────────────────────────────────────────────

  describe('GET /api/v1/goals/:id', () => {
    it('retrieves goal detail with full contributions list', async () => {
      const res = await request(app)
        .get(`/api/v1/goals/${createdGoalId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.goal.name).toBe('Emergency Fund');
      expect(res.body.data.goal.contributions).toHaveLength(3);
    });

    it('returns 404 when User B tries to view User A goal', async () => {
      const res = await request(app)
        .get(`/api/v1/goals/${createdGoalId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Update Goal ──────────────────────────────────────────────────────────────

  describe('PUT /api/v1/goals/:id', () => {
    it('updates goal details', async () => {
      const res = await request(app)
        .put(`/api/v1/goals/${createdGoalId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Updated Emergency Fund Reserve',
          priority: 'medium',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.goal.name).toBe('Updated Emergency Fund Reserve');
      expect(res.body.data.goal.priority).toBe('medium');
    });
  });

  // ── Delete Goal ──────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/goals/:id', () => {
    it('deletes a goal and cleans up contributions', async () => {
      const res = await request(app)
        .delete(`/api/v1/goals/${createdGoalId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify goal is gone
      const getRes = await request(app)
        .get(`/api/v1/goals/${createdGoalId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(getRes.status).toBe(404);

      // Verify contributions cleaned up
      const contribs = await GoalContribution.find({
        goalId: new mongoose.Types.ObjectId(createdGoalId),
      });
      expect(contribs).toHaveLength(0);
    });
  });
});
