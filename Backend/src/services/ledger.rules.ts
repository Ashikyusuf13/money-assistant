import { TransactionType } from '../constants/accounting';

export interface LedgerTransactionEntry {
  type: TransactionType;
  amount: number; // in integer paise
  accountId?: string;
  toAccountId?: string;
  isArchived?: boolean;
}

export interface CashFlowSummary {
  totalIncome: number;          // Paise from 'income'
  totalExpenses: number;        // Paise from 'expense'
  totalRefunds: number;         // Paise from 'refund'
  netOperatingExpense: number;  // totalExpenses - totalRefunds
  netCashFlow: number;          // totalIncome - netOperatingExpense
}

export interface BudgetUtilizationResult {
  budgetAmount: number;         // Budget limit in paise
  spentPaise: number;           // Net category spend: expenses - refunds
  remainingPaise: number;       // budgetAmount - spentPaise
  utilizationPercentage: number;// Rounded to 2 decimals
  isExceeded: boolean;          // spentPaise > budgetAmount
  isAlertTriggered: boolean;    // utilizationPercentage >= alertThreshold
}

export interface GoalProgressResult {
  targetAmount: number;         // in paise
  currentAmount: number;        // in paise (contributions - withdrawals)
  remainingAmount: number;      // max(0, targetAmount - currentAmount)
  percentage: number;           // min(100, (currentAmount / targetAmount) * 100) rounded to 2 decimals
  isCompleted: boolean;
}

/**
 * Calculates the balance of a specific tracked account based on opening balance
 * and transaction history.
 */
export function calculateAccountBalance(
  openingBalance: number,
  transactions: LedgerTransactionEntry[],
  accountId: string,
): number {
  let balance = openingBalance;

  for (const tx of transactions) {
    if (tx.isArchived) continue;

    const isSource = tx.accountId === accountId;
    const isDest = tx.toAccountId === accountId;

    switch (tx.type) {
      case 'income':
        if (isSource) balance += tx.amount;
        break;
      case 'expense':
        if (isSource) balance -= tx.amount;
        break;
      case 'refund':
        if (isSource) balance += tx.amount;
        break;
      case 'transfer':
        if (isSource) balance -= tx.amount;
        if (isDest) balance += tx.amount;
        break;
    }
  }

  return balance;
}

/**
 * Calculates cash flow totals for a collection of transactions.
 * Internal transfers are strictly excluded from income/expense totals.
 */
export function calculatePeriodCashFlow(
  transactions: LedgerTransactionEntry[],
): CashFlowSummary {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalRefunds = 0;

  for (const tx of transactions) {
    if (tx.isArchived) continue;

    switch (tx.type) {
      case 'income':
        totalIncome += tx.amount;
        break;
      case 'expense':
        totalExpenses += tx.amount;
        break;
      case 'refund':
        totalRefunds += tx.amount;
        break;
      case 'transfer':
        // Transfers do not affect net income or expense totals
        break;
    }
  }

  const netOperatingExpense = Math.max(0, totalExpenses - totalRefunds);
  const netCashFlow = totalIncome - netOperatingExpense;

  return {
    totalIncome,
    totalExpenses,
    totalRefunds,
    netOperatingExpense,
    netCashFlow,
  };
}

/**
 * Calculates budget utilization for a category given its budget limit,
 * alert threshold percentage, and transactions belonging to that category.
 */
export function calculateBudgetUtilization(
  budgetAmount: number,
  alertThreshold: number,
  categoryTransactions: LedgerTransactionEntry[],
): BudgetUtilizationResult {
  let expenses = 0;
  let refunds = 0;

  for (const tx of categoryTransactions) {
    if (tx.isArchived) continue;
    if (tx.type === 'expense') {
      expenses += tx.amount;
    } else if (tx.type === 'refund') {
      refunds += tx.amount;
    }
  }

  const spentPaise = Math.max(0, expenses - refunds);
  const remainingPaise = budgetAmount - spentPaise;
  const utilizationPercentage =
    budgetAmount > 0
      ? Math.round(((spentPaise / budgetAmount) * 100) * 100) / 100
      : 0;

  return {
    budgetAmount,
    spentPaise,
    remainingPaise,
    utilizationPercentage,
    isExceeded: spentPaise > budgetAmount,
    isAlertTriggered: utilizationPercentage >= alertThreshold,
  };
}

/**
 * Calculates savings goal progress from a history of contributions and withdrawals.
 */
export function calculateGoalProgress(
  targetAmount: number,
  contributions: { type: 'contribution' | 'withdrawal'; amount: number }[],
): GoalProgressResult {
  let currentAmount = 0;

  for (const c of contributions) {
    if (c.type === 'contribution') {
      currentAmount += c.amount;
    } else if (c.type === 'withdrawal') {
      currentAmount -= c.amount;
    }
  }

  // Current amount cannot be negative
  currentAmount = Math.max(0, currentAmount);
  const remainingAmount = Math.max(0, targetAmount - currentAmount);
  const rawPercentage =
    targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const percentage = Math.min(100, Math.round(rawPercentage * 100) / 100);

  return {
    targetAmount,
    currentAmount,
    remainingAmount,
    percentage,
    isCompleted: currentAmount >= targetAmount,
  };
}
