import { Types } from 'mongoose';
import {
  Account,
  Budget,
  Goal,
  Salary,
  Transaction,
  IAccountDocument,
  ITransactionDocument,
} from '../models';
import {
  calculateBudgetUtilization,
  calculatePeriodCashFlow,
  LedgerTransactionEntry,
} from './ledger.rules';
import { calculatePace } from './goal.service';

export interface CategorySpendSummary {
  category: string;
  spentPaise: number;
  percentageOfTotal: number;
}

export interface BudgetHighlight {
  category: string;
  budgetAmount: number;
  spentPaise: number;
  remainingPaise: number;
  utilizationPercentage: number;
  isExceeded: boolean;
  isAlertTriggered: boolean;
}

export interface GoalHighlight {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentage: number;
  targetDate: Date;
}

export interface DashboardResponse {
  month: string;
  totalTrackedWealthPaise: number;
  netWealth: number;
  accounts: {
    id: string;
    name: string;
    type: string;
    currency: string;
    currentBalance: number;
  }[];
  cashFlow: {
    totalIncome: number;
    totalExpenses: number;
    totalRefunds: number;
    netOperatingExpense: number;
    netCashFlow: number;
  };
  monthlySummary: {
    income: number;
    expense: number;
    netCashFlow: number;
    currentBalance?: number;
  };
  budgets: {
    totalIncome?: number;
    savingsTarget?: number;
    availableExpenseBudget?: number;
    totalBudget: number;
    totalSpent: number;
    remainingBudget?: number;
    overallUtilizationPercentage: number;
  };
  goals: {
    activeGoalsCount: number;
    totalTarget: number;
    totalSaved: number;
  };
  insights: Array<{
    type: 'spending' | 'budget' | 'savings' | 'unusual_spending' | 'salary';
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'positive';
  }>;
  periodComparison: {
    previousMonth: string;
    previousNetExpense: number;
    expenseDeltaPaise: number;
    expenseChangePercentage: number;
    previousNetCashFlow: number;
  };
  salaryStatus: {
    baseMonthlySalary: number | null;
    salaryReceivedThisMonth: number;
    remainingExpectedSalary: number;
    remainingSalaryAfterExpenses: number;
  };
  categoryBreakdown: CategorySpendSummary[];
  budgetHighlights: BudgetHighlight[];
  goalsSummary: {
    totalTargetPaise: number;
    totalSavedPaise: number;
    overallProgressPercentage: number;
    activeGoals: GoalHighlight[];
  };
  recentTransactions: ITransactionDocument[];
}

/**
 * Parses YYYY-MM into UTC start and end dates.
 */
function getMonthBounds(yearMonth: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10) - 1; // 0-indexed

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  // Next month day 0 gives last day of current month
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

/**
 * Returns previous YYYY-MM string given a YYYY-MM string.
 */
function getPreviousMonthStr(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  let year = parseInt(yearStr!, 10);
  let month = parseInt(monthStr!, 10) - 1; // Previous month 1-12
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return `${year}-${month.toString().padStart(2, '0')}`;
}

/**
 * Retrieves comprehensive financial dashboard data for a given month.
 */
export async function getDashboardSummary(
  userId: string,
  selectedMonth?: string,
): Promise<DashboardResponse> {
  const userObjectId = new Types.ObjectId(userId);

  // Default to current UTC month if not provided
  const now = new Date();
  const currentMonthStr = `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}`;
  const month = selectedMonth || currentMonthStr;
  const previousMonthStr = getPreviousMonthStr(month);

  const currentBounds = getMonthBounds(month);
  const previousBounds = getMonthBounds(previousMonthStr);

  // 1. Fetch Accounts
  const accounts = await Account.find({
    userId: userObjectId,
    isArchived: false,
  });

  const totalTrackedWealthPaise = accounts.reduce(
    (sum, acc) => sum + acc.currentBalance,
    0,
  );

  // 2. Fetch Current Month Transactions
  const currentMonthTransactions = await Transaction.find({
    userId: userObjectId,
    isArchived: false,
    date: { $gte: currentBounds.start, $lte: currentBounds.end },
  });

  // Map to ledger entries
  const currentLedgerEntries: LedgerTransactionEntry[] = currentMonthTransactions.map(
    (tx) => ({
      type: tx.type,
      amount: tx.amount,
      accountId: tx.accountId?.toString(),
      toAccountId: tx.toAccountId?.toString(),
      isArchived: tx.isArchived,
    }),
  );

  const cashFlow = calculatePeriodCashFlow(currentLedgerEntries);

  // 3. Fetch Previous Month Transactions for Comparison
  const previousMonthTransactions = await Transaction.find({
    userId: userObjectId,
    isArchived: false,
    date: { $gte: previousBounds.start, $lte: previousBounds.end },
  });

  const previousLedgerEntries: LedgerTransactionEntry[] = previousMonthTransactions.map(
    (tx) => ({
      type: tx.type,
      amount: tx.amount,
      accountId: tx.accountId?.toString(),
      toAccountId: tx.toAccountId?.toString(),
      isArchived: tx.isArchived,
    }),
  );

  const previousCashFlow = calculatePeriodCashFlow(previousLedgerEntries);

  const expenseDeltaPaise = cashFlow.netOperatingExpense - previousCashFlow.netOperatingExpense;
  const expenseChangePercentage =
    previousCashFlow.netOperatingExpense > 0
      ? Math.round(((expenseDeltaPaise / previousCashFlow.netOperatingExpense) * 100) * 100) / 100
      : 0;

  // 4. Category Spending Breakdown
  const categoryMap = new Map<string, { expenses: number; refunds: number }>();

  for (const tx of currentMonthTransactions) {
    if (tx.type === 'expense' || tx.type === 'refund') {
      const entry = categoryMap.get(tx.category) || { expenses: 0, refunds: 0 };
      if (tx.type === 'expense') entry.expenses += tx.amount;
      if (tx.type === 'refund') entry.refunds += tx.amount;
      categoryMap.set(tx.category, entry);
    }
  }

  const categoryBreakdown: CategorySpendSummary[] = [];
  for (const [category, { expenses, refunds }] of categoryMap.entries()) {
    const netSpend = Math.max(0, expenses - refunds);
    if (netSpend > 0) {
      const percentage =
        cashFlow.netOperatingExpense > 0
          ? Math.round(((netSpend / cashFlow.netOperatingExpense) * 100) * 100) / 100
          : 0;
      categoryBreakdown.push({
        category,
        spentPaise: netSpend,
        percentageOfTotal: percentage,
      });
    }
  }
  categoryBreakdown.sort((a, b) => b.spentPaise - a.spentPaise);

  // 5. Salary Status & Monthly Balance
  const salaryProfile = await Salary.findOne({ userId: userObjectId });
  const salaryReceivedThisMonth = currentMonthTransactions
    .filter((tx) => tx.type === 'income' && tx.category === 'salary')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const baseMonthlySalary = salaryProfile?.baseMonthlySalary ?? null;
  const remainingExpectedSalary =
    baseMonthlySalary !== null
      ? Math.max(0, baseMonthlySalary - salaryReceivedThisMonth)
      : 0;

  // Total month income considers base salary from profile + any other income recorded
  const totalMonthIncome = baseMonthlySalary && baseMonthlySalary > 0
    ? Math.max(baseMonthlySalary, cashFlow.totalIncome)
    : cashFlow.totalIncome;

  // Current balance for the selected month: total month income minus expenses incurred
  const remainingSalaryAfterExpenses = totalMonthIncome - cashFlow.netOperatingExpense;

  // 6. Budgets Highlights
  const monthlyBudgets = await Budget.find({
    userId: userObjectId,
    month,
  });

  const budgetHighlights: BudgetHighlight[] = monthlyBudgets.map((b) => {
    const bCat = (b.category || '').toLowerCase().trim();
    const categoryTxs = currentLedgerEntries.filter(
      (_, idx) => (currentMonthTransactions[idx]?.category || '').toLowerCase().trim() === bCat,
    );
    const util = calculateBudgetUtilization(b.amount, b.alertThreshold, categoryTxs);
    return {
      category: b.category,
      budgetAmount: b.amount,
      spentPaise: util.spentPaise,
      remainingPaise: util.remainingPaise,
      utilizationPercentage: util.utilizationPercentage,
      isExceeded: util.isExceeded,
      isAlertTriggered: util.isAlertTriggered,
    };
  });

  // 7. Goals Summary
  const activeGoals = await Goal.find({
    userId: userObjectId,
    status: 'active',
  });

  const totalTargetPaise = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSavedPaise = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgressPercentage =
    totalTargetPaise > 0
      ? Math.round(((totalSavedPaise / totalTargetPaise) * 100) * 100) / 100
      : 0;

  const goalHighlights: GoalHighlight[] = activeGoals.map((g) => ({
    id: g._id.toString(),
    name: g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    remainingAmount: Math.max(0, g.targetAmount - g.currentAmount),
    percentage:
      g.targetAmount > 0
        ? Math.min(100, Math.round(((g.currentAmount / g.targetAmount) * 100) * 100) / 100)
        : 0,
    targetDate: g.targetDate,
  }));

  // 8. Recent Transactions for the Selected Month (Latest 4) - Newest Created First
  const recentTransactions = await Transaction.find({
    userId: userObjectId,
    isArchived: false,
    date: { $gte: currentBounds.start, $lte: currentBounds.end },
  })
    .sort({ createdAt: -1, date: -1, _id: -1 })
    .limit(4);

  // 9. Financial Calculations (Consistent Monthly Budget Engine)
  // Total Income = All income transactions for the selected month (or starting profile salary)
  // Savings Target = Sum of active monthly goal savings pace
  const savingsTargetPaise = activeGoals.reduce((sum, g) => {
    const pace = calculatePace(g.targetAmount, g.currentAmount, g.targetDate);
    return sum + (pace.requiredMonthlyContributionPaise > 0 ? pace.requiredMonthlyContributionPaise : 0);
  }, 0);

  // Available Expense Budget = Total Income - Savings Target
  const rawAvailableExpenseBudget = Math.max(0, totalMonthIncome - savingsTargetPaise);

  // Total Category Budget limits allocated by user
  const totalCategoryBudgetPaise = budgetHighlights.reduce((sum, b) => sum + b.budgetAmount, 0);

  // Total Expenses = All valid expense transactions for the selected month
  const totalExpensePaise = cashFlow.netOperatingExpense;

  // Effective Budget Limit: Use allocated category budgets if user created them, otherwise Available Expense Budget
  const effectiveBudgetLimit = totalCategoryBudgetPaise > 0
    ? totalCategoryBudgetPaise
    : rawAvailableExpenseBudget;

  // Remaining Budget = Available Expense Budget - Total Expenses (Distinct from remaining wallet balance)
  const remainingBudgetPaise = Math.max(0, effectiveBudgetLimit - totalExpensePaise);

  // Budget Utilization = (Total Expenses / Available Expense Budget) * 100
  const overallUtilizationPercentage =
    effectiveBudgetLimit > 0
      ? Math.round((totalExpensePaise / effectiveBudgetLimit) * 100)
      : 0;

  const insights: DashboardResponse['insights'] = [];
  if (cashFlow.netCashFlow > 0) {
    insights.push({
      type: 'savings',
      title: 'Positive Cash Flow',
      message: `You have saved ₹${(cashFlow.netCashFlow / 100).toFixed(0)} so far this month.`,
      severity: 'positive',
    });
  } else if (cashFlow.netCashFlow < 0) {
    insights.push({
      type: 'spending',
      title: 'Net Outflow Alert',
      message: `Expenses exceed income by ₹${(Math.abs(cashFlow.netCashFlow) / 100).toFixed(0)} this month.`,
      severity: 'warning',
    });
  }

  const criticalBudgets = budgetHighlights.filter((b) => b.isAlertTriggered || b.isExceeded);
  for (const b of criticalBudgets) {
    insights.push({
      type: 'budget',
      title: `${b.category.charAt(0).toUpperCase() + b.category.slice(1)} Budget`,
      message: b.isExceeded
        ? `Exceeded budget limit by ${b.utilizationPercentage}%.`
        : `Reaching limit (${b.utilizationPercentage}% spent).`,
      severity: 'warning',
    });
  }

  if (baseMonthlySalary && salaryReceivedThisMonth >= baseMonthlySalary) {
    insights.push({
      type: 'salary',
      title: 'Salary Credited',
      message: `Full monthly salary has been credited.`,
      severity: 'positive',
    });
  }

  return {
    month,
    totalTrackedWealthPaise,
    netWealth: remainingSalaryAfterExpenses,
    accounts: accounts.map((acc: IAccountDocument) => ({
      id: acc._id.toString(),
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      currentBalance: acc.currentBalance,
    })),
    cashFlow,
    monthlySummary: {
      income: totalMonthIncome,
      expense: cashFlow.netOperatingExpense,
      netCashFlow: totalMonthIncome - cashFlow.netOperatingExpense,
      currentBalance: remainingSalaryAfterExpenses,
    },
    budgets: {
      totalIncome: totalMonthIncome,
      savingsTarget: savingsTargetPaise,
      availableExpenseBudget: effectiveBudgetLimit,
      totalBudget: effectiveBudgetLimit,
      totalSpent: totalExpensePaise,
      remainingBudget: remainingBudgetPaise,
      overallUtilizationPercentage,
    },
    goals: {
      activeGoalsCount: activeGoals.length,
      totalTarget: totalTargetPaise,
      totalSaved: totalSavedPaise,
    },
    insights,
    periodComparison: {
      previousMonth: previousMonthStr,
      previousNetExpense: previousCashFlow.netOperatingExpense,
      expenseDeltaPaise,
      expenseChangePercentage,
      previousNetCashFlow: previousCashFlow.netCashFlow,
    },
    salaryStatus: {
      baseMonthlySalary,
      salaryReceivedThisMonth,
      remainingExpectedSalary,
      remainingSalaryAfterExpenses,
    },
    categoryBreakdown,
    budgetHighlights,
    goalsSummary: {
      totalTargetPaise,
      totalSavedPaise,
      overallProgressPercentage,
      activeGoals: goalHighlights,
    },
    recentTransactions,
  };
}
