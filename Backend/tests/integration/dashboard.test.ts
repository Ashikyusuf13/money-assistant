import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { Account, Budget, Goal, Salary, Transaction } from '../../src/models';

const app = createApp();

describe('Dashboard and Financial Calculations Integration Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let userAAcc1Id: string;
  let userAAcc2Id: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env['MONGODB_URI'] as string);
    }

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'Dashboard User A',
      email: `dash-user-a-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userAToken = resA.body.data.tokens.accessToken;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'Dashboard User B',
      email: `dash-user-b-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userBToken = resB.body.data.tokens.accessToken;
    userBId = resB.body.data.user.id;

    // Setup User A Accounts
    const acc1 = await Account.create({
      userId: new mongoose.Types.ObjectId(userAId),
      name: 'HDFC Bank',
      type: 'bank',
      openingBalance: 5000000, // 50,000 INR
    });
    userAAcc1Id = acc1._id.toString();

    const acc2 = await Account.create({
      userId: new mongoose.Types.ObjectId(userAId),
      name: 'Cash Wallet',
      type: 'cash',
      openingBalance: 1000000, // 10,000 INR
    });
    userAAcc2Id = acc2._id.toString();

    // Setup Salary Profile for User A
    await Salary.create({
      userId: new mongoose.Types.ObjectId(userAId),
      baseMonthlySalary: 10000000, // 100,000 INR
      effectiveDate: new Date('2026-01-01'),
    });

    // Populate October 2026 transactions for User A
    // 1. Salary Income: 100,000 INR
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'income',
        amount: 10000000,
        category: 'salary',
        description: 'October Salary',
        accountId: userAAcc1Id,
        date: '2026-10-01T10:00:00.000Z',
      });

    // 2. Expense: Groceries 20,000 INR
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'expense',
        amount: 2000000,
        category: 'groceries',
        description: 'Monthly Groceries',
        accountId: userAAcc1Id,
        date: '2026-10-05T12:00:00.000Z',
      });

    // 3. Expense: Dining 10,000 INR
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'expense',
        amount: 1000000,
        category: 'dining',
        description: 'Weekend Dining',
        accountId: userAAcc1Id,
        date: '2026-10-10T14:00:00.000Z',
      });

    // 4. Refund: Dining return 2,000 INR
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'refund',
        amount: 200000,
        category: 'dining',
        description: 'Dining Bill Adjustment Refund',
        accountId: userAAcc1Id,
        date: '2026-10-11T16:00:00.000Z',
      });

    // 5. Transfer: HDFC to Cash 5,000 INR (must NOT count as income or expense!)
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'transfer',
        amount: 500000,
        category: 'transfer',
        description: 'ATM Cash Withdrawal',
        accountId: userAAcc1Id,
        toAccountId: userAAcc2Id,
        date: '2026-10-15T09:00:00.000Z',
      });

    // Setup Budgets for October 2026
    await Budget.create({
      userId: new mongoose.Types.ObjectId(userAId),
      category: 'groceries',
      amount: 2500000, // 25,000 INR limit (spent 20,000 -> 80% util)
      month: '2026-10',
      alertThreshold: 80,
    });

    await Budget.create({
      userId: new mongoose.Types.ObjectId(userAId),
      category: 'dining',
      amount: 500000, // 5,000 INR limit (net spent 8,000 -> 160% util, EXCEEDED!)
      month: '2026-10',
      alertThreshold: 75,
    });

    // Setup Goal for User A
    await Goal.create({
      userId: new mongoose.Types.ObjectId(userAId),
      name: 'Emergency Fund',
      targetAmount: 5000000, // 50,000 INR
      currentAmount: 2000000, // 20,000 INR (40%)
      targetDate: new Date('2027-12-31'),
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
    const res = await request(app).get('/api/v1/dashboard');
    expect(res.status).toBe(401);
  });

  // ── Dashboard Calculations Reconciliation ────────────────────────────────────

  describe('GET /api/v1/dashboard?month=2026-10', () => {
    it('reconciles tracked wealth, cash flow, budget highlights, and salary status', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard?month=2026-10')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.month).toBe('2026-10');

      // 1. Total Tracked Wealth
      // Initial: 50,000 (acc1) + 10,000 (acc2) = 60,000 INR
      // Acc1: 50,000 + 100,000 (salary) - 20,000 (groceries) - 10,000 (dining) + 2,000 (refund) - 5,000 (transfer) = 117,000 INR = 11,700,000 paise
      // Acc2: 10,000 + 5,000 (transfer) = 15,000 INR = 1,500,000 paise
      // Total Wealth: 11,700,000 + 1,500,000 = 13,200,000 paise (132,000 INR)
      expect(data.totalTrackedWealthPaise).toBe(13200000);
      expect(data.accounts).toHaveLength(2);

      // 2. Cash Flow
      // Total Income: 100,000 INR (10,000,000 paise)
      expect(data.cashFlow.totalIncome).toBe(10000000);
      // Total Expenses: 20,000 + 10,000 = 30,000 INR (3,000,000 paise)
      expect(data.cashFlow.totalExpenses).toBe(3000000);
      // Total Refunds: 2,000 INR (200,000 paise)
      expect(data.cashFlow.totalRefunds).toBe(200000);
      // Net Operating Expense: 30,000 - 2,000 = 28,000 INR (2,800,000 paise)
      expect(data.cashFlow.netOperatingExpense).toBe(2800000);
      // Net Cash Flow: 100,000 - 28,000 = 72,000 INR (7,200,000 paise)
      expect(data.cashFlow.netCashFlow).toBe(7200000);

      // 3. Category Breakdown (Refund offsets dining!)
      const groceries = data.categoryBreakdown.find((c: { category: string }) => c.category === 'groceries');
      const dining = data.categoryBreakdown.find((c: { category: string }) => c.category === 'dining');

      expect(groceries.spentPaise).toBe(2000000); // 20,000 INR
      expect(dining.spentPaise).toBe(800000);     // 10,000 - 2,000 = 8,000 INR (800,000 paise)

      // 4. Budget Highlights
      const groceriesBudget = data.budgetHighlights.find((b: { category: string }) => b.category === 'groceries');
      const diningBudget = data.budgetHighlights.find((b: { category: string }) => b.category === 'dining');

      expect(groceriesBudget.utilizationPercentage).toBe(80);
      expect(groceriesBudget.isExceeded).toBe(false);
      expect(groceriesBudget.isAlertTriggered).toBe(true); // threshold was 80%

      expect(diningBudget.utilizationPercentage).toBe(160); // 8,000 / 5,000 = 160%
      expect(diningBudget.isExceeded).toBe(true);

      // 5. Salary Status
      expect(data.salaryStatus.baseMonthlySalary).toBe(10000000);
      expect(data.salaryStatus.salaryReceivedThisMonth).toBe(10000000);
      expect(data.salaryStatus.remainingExpectedSalary).toBe(0);
      // 100,000 salary - 28,000 net expenses = 72,000 INR (7,200,000 paise)
      expect(data.salaryStatus.remainingSalaryAfterExpenses).toBe(7200000);

      // 6. Goals Summary
      expect(data.goalsSummary.totalTargetPaise).toBe(5000000);
      expect(data.goalsSummary.totalSavedPaise).toBe(2000000);
      expect(data.goalsSummary.overallProgressPercentage).toBe(40);
      expect(data.goalsSummary.activeGoals).toHaveLength(1);

      // 7. Recent Transactions (5 transactions populated)
      expect(data.recentTransactions).toHaveLength(5);
    });

    it('isolates user data: User B receives zero wealth and empty summaries', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard?month=2026-10')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalTrackedWealthPaise).toBe(0);
      expect(res.body.data.cashFlow.totalIncome).toBe(0);
      expect(res.body.data.cashFlow.totalExpenses).toBe(0);
      expect(res.body.data.categoryBreakdown).toHaveLength(0);
      expect(res.body.data.recentTransactions).toHaveLength(0);
    });
  });
});
