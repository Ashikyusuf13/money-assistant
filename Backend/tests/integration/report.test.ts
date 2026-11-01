import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { Account, Budget, Goal, Salary, Transaction } from '../../src/models';

const app = createApp();

describe('Reports and Financial Insights Integration Tests', () => {
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
      name: 'Report User A',
      email: `report-user-a-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userAToken = resA.body.data.tokens.accessToken;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'Report User B',
      email: `report-user-b-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userBToken = resB.body.data.tokens.accessToken;
    userBId = resB.body.data.user.id;

    // Setup User A Account
    const acc = await Account.create({
      userId: new mongoose.Types.ObjectId(userAId),
      name: 'Report Checking',
      type: 'bank',
      openingBalance: 10000000,
    });
    const accId = acc._id;

    // Setup Salary Profile with revisions
    await Salary.create({
      userId: new mongoose.Types.ObjectId(userAId),
      baseMonthlySalary: 12000000,
      effectiveDate: new Date('2026-06-01'),
      revisions: [
        {
          previousSalary: 10000000,
          revisedSalary: 12000000,
          effectiveDate: new Date('2026-06-01'),
          notes: 'Mid-year hike',
          createdAt: new Date(),
        },
      ],
    });

    // Populate September 2026 transactions for User A
    // Previous Month: Dining 5,000 INR (500,000 paise)
    await Transaction.create({
      userId: new mongoose.Types.ObjectId(userAId),
      type: 'expense',
      amount: 500000,
      category: 'dining',
      description: 'September Dining',
      accountId: accId,
      date: new Date('2026-09-15T12:00:00.000Z'),
    });

    // Populate October 2026 transactions for User A
    // 1. Salary Income: 120,000 INR
    await Transaction.create({
      userId: new mongoose.Types.ObjectId(userAId),
      type: 'income',
      amount: 12000000,
      category: 'salary',
      description: 'October Salary Credit',
      accountId: accId,
      date: new Date('2026-10-01T10:00:00.000Z'),
    });

    // 2. Dining Expense: 10,000 INR (100% spike compared to Sept 5,000 INR)
    await Transaction.create({
      userId: new mongoose.Types.ObjectId(userAId),
      type: 'expense',
      amount: 1000000,
      category: 'dining',
      description: 'October High-end Dining',
      accountId: accId,
      date: new Date('2026-10-10T14:00:00.000Z'),
    });

    // 3. Groceries Expense: 20,000 INR
    await Transaction.create({
      userId: new mongoose.Types.ObjectId(userAId),
      type: 'expense',
      amount: 2000000,
      category: 'groceries',
      description: 'Groceries Superstore',
      accountId: accId,
      date: new Date('2026-10-12T11:00:00.000Z'),
    });

    // 4. Groceries Refund: 2,000 INR (net groceries = 18,000 INR)
    await Transaction.create({
      userId: new mongoose.Types.ObjectId(userAId),
      type: 'refund',
      amount: 200000,
      category: 'groceries',
      description: 'Groceries Item Return',
      accountId: accId,
      date: new Date('2026-10-14T15:00:00.000Z'),
    });

    // Setup Budget for October: Dining limit 8,000 INR (spent 10,000 -> exceeded!)
    await Budget.create({
      userId: new mongoose.Types.ObjectId(userAId),
      category: 'dining',
      amount: 800000,
      month: '2026-10',
      alertThreshold: 75,
    });

    // Setup Goal approaching deadline in 15 days
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 15);
    await Goal.create({
      userId: new mongoose.Types.ObjectId(userAId),
      name: 'Laptop Fund',
      targetAmount: 8000000, // 80,000 INR
      currentAmount: 3000000, // 30,000 INR (< 50%)
      targetDate: deadline,
      status: 'active',
    });
  });

  afterAll(async () => {
    const ids = [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)];
    await Account.deleteMany({ userId: { $in: ids } });
    await Salary.deleteMany({ userId: { $in: ids } });
    await Transaction.deleteMany({ userId: { $in: ids } });
    await Budget.deleteMany({ userId: { $in: ids } });
    await Goal.deleteMany({ userId: { $in: ids } });
    await mongoose.connection.db?.collection('users').deleteMany({ _id: { $in: ids } });
    await mongoose.connection.db?.collection('sessions').deleteMany({ userId: { $in: ids } });
    await mongoose.disconnect();
  });

  // ── Authentication Check ─────────────────────────────────────────────────────

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/reports/period');
    expect(res.status).toBe(401);
  });

  // ── Period Cash Flow Report ──────────────────────────────────────────────────

  describe('GET /api/v1/reports/period', () => {
    it('generates period report with time-series buckets', async () => {
      const res = await request(app)
        .get('/api/v1/reports/period?period=monthly')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const report = res.body.data;
      expect(report.period).toBe('monthly');
      expect(report.summary.totalIncome).toBeGreaterThan(0);
      expect(report.summary.totalExpenses).toBeGreaterThan(0);
      expect(report.timeSeries.length).toBeGreaterThanOrEqual(1);

      const octoberBucket = report.timeSeries.find((b: { bucket: string }) => b.bucket === '2026-10');
      expect(octoberBucket).toBeDefined();
      expect(octoberBucket.incomePaise).toBe(12000000);
      expect(octoberBucket.expensePaise).toBe(3000000); // 10k + 20k = 30k INR
      expect(octoberBucket.refundPaise).toBe(200000);   // 2k INR
      expect(octoberBucket.netExpensePaise).toBe(2800000); // 28k INR
    });
  });

  // ── Category Report ──────────────────────────────────────────────────────────

  describe('GET /api/v1/reports/categories', () => {
    it('compares categories with month-over-month trend', async () => {
      const res = await request(app)
        .get('/api/v1/reports/categories?month=2026-10')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.month).toBe('2026-10');
      // Net spend: groceries (18,000 INR) + dining (10,000 INR) = 28,000 INR = 2,800,000 paise
      expect(data.totalSpendPaise).toBe(2800000);

      const dining = data.categories.find((c: { category: string }) => c.category === 'dining');
      expect(dining).toBeDefined();
      expect(dining.currentSpendPaise).toBe(1000000);
      expect(dining.previousSpendPaise).toBe(500000);
      // Increased from 5,000 to 10,000 -> +100% change
      expect(dining.deltaPaise).toBe(500000);
      expect(dining.percentageChange).toBe(100);
    });
  });

  // ── Salary Growth Report ─────────────────────────────────────────────────────

  describe('GET /api/v1/reports/salary-growth', () => {
    it('returns salary revisions and disbursement credits history', async () => {
      const res = await request(app)
        .get('/api/v1/reports/salary-growth')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.configuredSalary).toBe(12000000);
      expect(data.revisions).toHaveLength(1);
      expect(data.totalCreditsReceivedPaise).toBe(12000000);
      expect(data.totalCreditsCount).toBe(1);
    });
  });

  // ── Savings Progress Report ──────────────────────────────────────────────────

  describe('GET /api/v1/reports/savings-progress', () => {
    it('returns goals aggregation and savings statistics', async () => {
      const res = await request(app)
        .get('/api/v1/reports/savings-progress')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.totalGoalsCount).toBeGreaterThanOrEqual(1);
      expect(data.totalTargetPaise).toBe(8000000);
      expect(data.totalSavedPaise).toBe(3000000);
    });
  });

  // ── Financial Insights ───────────────────────────────────────────────────────

  describe('GET /api/v1/reports/insights', () => {
    it('generates rule-based deterministic insights for cash flow, unusual spending, deadline, and budgets', async () => {
      const res = await request(app)
        .get('/api/v1/reports/insights?month=2026-10')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const insights = res.body.data.insights;
      expect(insights.length).toBeGreaterThanOrEqual(3);

      // 1. Positive cash flow surplus insight
      const cashFlowInsight = insights.find((i: { type: string }) => i.type === 'cash_flow_health');
      expect(cashFlowInsight).toBeDefined();
      expect(cashFlowInsight.title).toBe('Positive Cash Flow');

      // 2. Unusual spending spike in dining (+100%) and groceries
      const unusualInsights = insights.filter((i: { type: string }) => i.type === 'unusual_spending');
      expect(unusualInsights.length).toBeGreaterThanOrEqual(1);
      expect(unusualInsights.some((i: { message: string }) => i.message.includes('dining'))).toBe(true);

      // 3. Approaching goal deadline within 30 days
      const deadlineInsight = insights.find((i: { type: string }) => i.type === 'approaching_deadline');
      expect(deadlineInsight).toBeDefined();
      expect(deadlineInsight.message).toContain('Laptop Fund');

      // 4. Budget exceeded alert (Dining exceeded limit)
      const budgetInsight = insights.find((i: { type: string }) => i.type === 'budget_alert');
      expect(budgetInsight).toBeDefined();
      expect(budgetInsight.severity).toBe('critical');
    });

    it('isolates user data: User B receives no data in insights', async () => {
      const res = await request(app)
        .get('/api/v1/reports/insights?month=2026-10')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.insights).toHaveLength(0);
    });
  });
});
