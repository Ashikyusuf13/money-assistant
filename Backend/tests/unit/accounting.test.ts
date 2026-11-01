import { describe, it, expect } from 'vitest';
import {
  isValidPaiseAmount,
  isNonNegativePaise,
  rupeesToPaise,
  paiseToRupeesString,
} from '../../src/constants/accounting';
import {
  calculateAccountBalance,
  calculatePeriodCashFlow,
  calculateBudgetUtilization,
  calculateGoalProgress,
  LedgerTransactionEntry,
} from '../../src/services/ledger.rules';

describe('Accounting & Ledger Domain Rules', () => {
  // ── Currency & Conversion ──────────────────────────────────────────────────

  describe('Paise validation and conversions', () => {
    it('validates positive safe integers as valid paise amounts', () => {
      expect(isValidPaiseAmount(100)).toBe(true);
      expect(isValidPaiseAmount(1)).toBe(true);
      expect(isValidPaiseAmount(500000000)).toBe(true);

      expect(isValidPaiseAmount(0)).toBe(false);
      expect(isValidPaiseAmount(-100)).toBe(false);
      expect(isValidPaiseAmount(100.5)).toBe(false);
      expect(isValidPaiseAmount('100')).toBe(false);
      expect(isValidPaiseAmount(null)).toBe(false);
    });

    it('validates non-negative safe integers for balances', () => {
      expect(isNonNegativePaise(0)).toBe(true);
      expect(isNonNegativePaise(10000)).toBe(true);
      expect(isNonNegativePaise(-1)).toBe(false);
      expect(isNonNegativePaise(10.5)).toBe(false);
    });

    it('accurately converts rupees to integer paise', () => {
      expect(rupeesToPaise(100)).toBe(10000);
      expect(rupeesToPaise(49.99)).toBe(4999);
      expect(rupeesToPaise(0)).toBe(0);
    });

    it('formats paise as rupee decimal strings', () => {
      expect(paiseToRupeesString(10050)).toBe('100.50');
      expect(paiseToRupeesString(5)).toBe('0.05');
      expect(paiseToRupeesString(0)).toBe('0.00');
      expect(paiseToRupeesString(-1500)).toBe('-15.00');
    });
  });

  // ── Account Balance Ledger Calculations ────────────────────────────────────

  describe('Account Balance Calculations', () => {
    const accA = 'account-1';
    const accB = 'account-2';

    it('calculates balance with opening balance and mixed transactions', () => {
      const openingBalance = 500000; // 5,000 INR
      const txs: LedgerTransactionEntry[] = [
        { type: 'income', amount: 200000, accountId: accA }, // +2,000
        { type: 'expense', amount: 50000, accountId: accA },  // -500
        { type: 'refund', amount: 10000, accountId: accA },   // +100
        { type: 'transfer', amount: 100000, accountId: accA, toAccountId: accB }, // -1,000 from accA
      ];

      // Net: 5000 + 2000 - 500 + 100 - 1000 = 5600 INR = 560000 paise
      const balance = calculateAccountBalance(openingBalance, txs, accA);
      expect(balance).toBe(560000);
    });

    it('correctly credits destination account on internal transfer', () => {
      const openingBalance = 100000; // 1,000 INR
      const txs: LedgerTransactionEntry[] = [
        { type: 'transfer', amount: 50000, accountId: accA, toAccountId: accB }, // +500 to accB
      ];

      const balance = calculateAccountBalance(openingBalance, txs, accB);
      expect(balance).toBe(150000);
    });

    it('ignores archived transactions', () => {
      const openingBalance = 100000;
      const txs: LedgerTransactionEntry[] = [
        { type: 'expense', amount: 30000, accountId: accA, isArchived: true },
      ];

      const balance = calculateAccountBalance(openingBalance, txs, accA);
      expect(balance).toBe(100000);
    });
  });

  // ── Period Cash Flow Calculations ──────────────────────────────────────────

  describe('Period Cash Flow Calculations', () => {
    it('calculates cash flow and accounts for refunds while excluding transfers', () => {
      const txs: LedgerTransactionEntry[] = [
        { type: 'income', amount: 10000000 }, // Salary: 100,000 INR
        { type: 'expense', amount: 3000000 }, // Living: 30,000 INR
        { type: 'refund', amount: 500000 },   // Reversal: 5,000 INR
        { type: 'transfer', amount: 2000000, accountId: 'acc1', toAccountId: 'acc2' }, // Transfer: 20,000 INR
      ];

      const summary = calculatePeriodCashFlow(txs);

      expect(summary.totalIncome).toBe(10000000);
      expect(summary.totalExpenses).toBe(3000000);
      expect(summary.totalRefunds).toBe(500000);
      expect(summary.netOperatingExpense).toBe(2500000); // 30,000 - 5,000 = 25,000 INR
      expect(summary.netCashFlow).toBe(7500000); // 100,000 - 25,000 = 75,000 INR
    });
  });

  // ── Budget Utilization Calculations ────────────────────────────────────────

  describe('Budget Utilization Calculations', () => {
    const budgetLimit = 1000000; // 10,000 INR

    it('calculates normal utilization without exceeding', () => {
      const txs: LedgerTransactionEntry[] = [
        { type: 'expense', amount: 400000 }, // 4,000 INR
        { type: 'expense', amount: 200000 }, // 2,000 INR
      ];

      const result = calculateBudgetUtilization(budgetLimit, 80, txs);
      expect(result.spentPaise).toBe(600000);
      expect(result.remainingPaise).toBe(400000);
      expect(result.utilizationPercentage).toBe(60);
      expect(result.isExceeded).toBe(false);
      expect(result.isAlertTriggered).toBe(false);
    });

    it('triggers alert threshold when utilization meets or exceeds threshold', () => {
      const txs: LedgerTransactionEntry[] = [
        { type: 'expense', amount: 850000 }, // 85%
      ];

      const result = calculateBudgetUtilization(budgetLimit, 80, txs);
      expect(result.utilizationPercentage).toBe(85);
      expect(result.isExceeded).toBe(false);
      expect(result.isAlertTriggered).toBe(true);
    });

    it('offsets expenses with refunds in category spend', () => {
      const txs: LedgerTransactionEntry[] = [
        { type: 'expense', amount: 900000 }, // 9,000 INR
        { type: 'refund', amount: 200000 },  // -2,000 INR refund
      ];

      // Net spend = 7,000 INR = 700000 paise (70% utilization)
      const result = calculateBudgetUtilization(budgetLimit, 80, txs);
      expect(result.spentPaise).toBe(700000);
      expect(result.utilizationPercentage).toBe(70);
      expect(result.isAlertTriggered).toBe(false);
    });

    it('identifies exceeded budgets', () => {
      const txs: LedgerTransactionEntry[] = [
        { type: 'expense', amount: 1200000 }, // 12,000 INR
      ];

      const result = calculateBudgetUtilization(budgetLimit, 80, txs);
      expect(result.spentPaise).toBe(1200000);
      expect(result.remainingPaise).toBe(-200000);
      expect(result.utilizationPercentage).toBe(120);
      expect(result.isExceeded).toBe(true);
      expect(result.isAlertTriggered).toBe(true);
    });
  });

  // ── Savings Goal Progress Calculations ─────────────────────────────────────

  describe('Savings Goal Progress Calculations', () => {
    const targetAmount = 5000000; // 50,000 INR

    it('tracks goal contributions and computes progress', () => {
      const contributions: { type: 'contribution' | 'withdrawal'; amount: number }[] = [
        { type: 'contribution', amount: 1000000 },
        { type: 'contribution', amount: 1500000 },
        { type: 'withdrawal', amount: 500000 },
      ];

      // Current: 2,000,000 paise (20,000 INR) -> 40%
      const progress = calculateGoalProgress(targetAmount, contributions);
      expect(progress.currentAmount).toBe(2000000);
      expect(progress.remainingAmount).toBe(3000000);
      expect(progress.percentage).toBe(40);
      expect(progress.isCompleted).toBe(false);
    });

    it('marks goal completed when target is met or exceeded', () => {
      const contributions: { type: 'contribution' | 'withdrawal'; amount: number }[] = [
        { type: 'contribution', amount: 5500000 },
      ];

      const progress = calculateGoalProgress(targetAmount, contributions);
      expect(progress.currentAmount).toBe(5500000);
      expect(progress.remainingAmount).toBe(0);
      expect(progress.percentage).toBe(100);
      expect(progress.isCompleted).toBe(true);
    });
  });
});
