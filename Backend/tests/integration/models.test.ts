import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import {
  Account,
  Salary,
  Transaction,
  Budget,
  Goal,
  GoalContribution,
} from '../../src/models';

describe('Financial Models & Validation Integration Tests', () => {
  const testUserId = new Types.ObjectId();
  const otherUserId = new Types.ObjectId();

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env['MONGODB_URI'] as string);
    }
    // Ensure clean state and sync latest indexes
    await Transaction.deleteMany({});
    try {
      await Transaction.collection.dropIndexes();
    } catch {
      // ignore if collection newly created
    }
    await Transaction.syncIndexes();
    await Budget.syncIndexes();
  });

  afterAll(async () => {
    await Account.deleteMany({ userId: { $in: [testUserId, otherUserId] } });
    await Salary.deleteMany({ userId: { $in: [testUserId, otherUserId] } });
    await Transaction.deleteMany({ userId: { $in: [testUserId, otherUserId] } });
    await Budget.deleteMany({ userId: { $in: [testUserId, otherUserId] } });
    await Goal.deleteMany({ userId: { $in: [testUserId, otherUserId] } });
    await GoalContribution.deleteMany({ userId: { $in: [testUserId, otherUserId] } });
    await mongoose.disconnect();
  });

  // ── Account Model ──────────────────────────────────────────────────────────

  describe('Account Model', () => {
    it('creates an account with valid attributes and defaults', async () => {
      const account = await Account.create({
        userId: testUserId,
        name: 'HDFC Savings',
        type: 'bank',
        openingBalance: 2500000, // 25,000 INR in paise
      });

      expect(account._id).toBeDefined();
      expect(account.name).toBe('HDFC Savings');
      expect(account.currency).toBe('INR');
      expect(account.openingBalance).toBe(2500000);
      expect(account.currentBalance).toBe(2500000);
      expect(account.isArchived).toBe(false);
    });

    it('rejects floating-point opening balances', async () => {
      await expect(
        Account.create({
          userId: testUserId,
          name: 'Invalid Account',
          type: 'bank',
          openingBalance: 100.5,
        }),
      ).rejects.toThrow();
    });
  });

  // ── Salary Model ───────────────────────────────────────────────────────────

  describe('Salary Model', () => {
    it('creates a salary profile with revision history', async () => {
      const salary = await Salary.create({
        userId: testUserId,
        baseMonthlySalary: 12000000, // 120,000 INR
        effectiveDate: new Date('2026-01-01'),
        revisions: [
          {
            previousSalary: 10000000,
            revisedSalary: 12000000,
            effectiveDate: new Date('2026-01-01'),
            notes: 'Annual appraisal increment',
            createdAt: new Date(),
          },
        ],
      });

      expect(salary.baseMonthlySalary).toBe(12000000);
      expect(salary.revisions).toHaveLength(1);
      expect(salary.revisions[0]?.revisedSalary).toBe(12000000);
    });

    it('enforces unique salary profile per user', async () => {
      await expect(
        Salary.create({
          userId: testUserId,
          baseMonthlySalary: 15000000,
          effectiveDate: new Date(),
        }),
      ).rejects.toThrow();
    });
  });

  // ── Transaction Model ──────────────────────────────────────────────────────

  describe('Transaction Model', () => {
    let sourceAccId: Types.ObjectId;
    let destAccId: Types.ObjectId;

    beforeAll(async () => {
      const acc1 = await Account.create({
        userId: testUserId,
        name: 'Checking Account',
        type: 'bank',
        openingBalance: 1000000,
      });
      const acc2 = await Account.create({
        userId: testUserId,
        name: 'Emergency Savings',
        type: 'savings',
        openingBalance: 500000,
      });
      sourceAccId = acc1._id;
      destAccId = acc2._id;
    });

    it('creates income and expense transactions with integer paise', async () => {
      const incomeTx = await Transaction.create({
        userId: testUserId,
        type: 'income',
        amount: 8000000, // 80,000 INR
        category: 'salary',
        description: 'Monthly Salary Credit',
        accountId: sourceAccId,
      });
      expect(incomeTx.amount).toBe(8000000);
      expect(incomeTx.category).toBe('salary');

      const expenseTx = await Transaction.create({
        userId: testUserId,
        type: 'expense',
        amount: 150000, // 1,500 INR
        category: 'food_dining',
        description: 'Dinner at restaurant',
        accountId: sourceAccId,
      });
      expect(expenseTx.amount).toBe(150000);
    });

    it('requires destination toAccountId distinct from accountId for transfers', async () => {
      // Missing toAccountId
      await expect(
        Transaction.create({
          userId: testUserId,
          type: 'transfer',
          amount: 500000,
          category: 'transfer',
          description: 'Transfer to savings',
          accountId: sourceAccId,
        }),
      ).rejects.toThrow();

      // Same accountId and toAccountId
      await expect(
        Transaction.create({
          userId: testUserId,
          type: 'transfer',
          amount: 500000,
          category: 'transfer',
          description: 'Self-transfer',
          accountId: sourceAccId,
          toAccountId: sourceAccId,
        }),
      ).rejects.toThrow();

      // Valid transfer
      const validTransfer = await Transaction.create({
        userId: testUserId,
        type: 'transfer',
        amount: 500000,
        category: 'transfer',
        description: 'Transfer to savings',
        accountId: sourceAccId,
        toAccountId: destAccId,
      });
      expect(validTransfer._id).toBeDefined();
    });

    it('rejects zero or negative transaction amounts', async () => {
      await expect(
        Transaction.create({
          userId: testUserId,
          type: 'expense',
          amount: 0,
          category: 'other',
          description: 'Zero amount',
        }),
      ).rejects.toThrow();

      await expect(
        Transaction.create({
          userId: testUserId,
          type: 'expense',
          amount: -500,
          category: 'other',
          description: 'Negative amount',
        }),
      ).rejects.toThrow();
    });
  });

  // ── Budget Model ───────────────────────────────────────────────────────────

  describe('Budget Model', () => {
    it('creates a budget and enforces unique compound index [userId, category, month]', async () => {
      await Budget.create({
        userId: testUserId,
        category: 'groceries',
        amount: 2000000, // 20,000 INR
        month: '2026-10',
        alertThreshold: 85,
      });

      // Duplicate budget for same user, category, and month should fail
      await expect(
        Budget.create({
          userId: testUserId,
          category: 'groceries',
          amount: 2500000,
          month: '2026-10',
        }),
      ).rejects.toThrow();
    });

    it('validates month format YYYY-MM', async () => {
      await expect(
        Budget.create({
          userId: testUserId,
          category: 'utilities',
          amount: 500000,
          month: '2026-13', // Invalid month
        }),
      ).rejects.toThrow();
    });
  });

  // ── Goal and GoalContribution Models ───────────────────────────────────────

  describe('Goal and GoalContribution Models', () => {
    it('creates a goal and logs contributions', async () => {
      const goal = await Goal.create({
        userId: testUserId,
        name: 'New Car Downpayment',
        targetAmount: 50000000, // 500,000 INR
        targetDate: new Date('2027-06-30'),
        priority: 'high',
      });

      expect(goal._id).toBeDefined();
      expect(goal.status).toBe('active');
      expect(goal.currentAmount).toBe(0);

      const contribution = await GoalContribution.create({
        userId: testUserId,
        goalId: goal._id,
        type: 'contribution',
        amount: 5000000, // 50,000 INR
      });

      expect(contribution.amount).toBe(5000000);
      expect(contribution.goalId.equals(goal._id)).toBe(true);
    });
  });
});
