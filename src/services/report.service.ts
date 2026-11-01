import { Types } from 'mongoose';
import {
  Budget,
  Goal,
  GoalContribution,
  Salary,
  Transaction,
} from '../models';
import {
  CategoryReportQuery,
  InsightsQuery,
  PeriodReportQuery,
} from '../validators/report.validators';
import {
  calculateBudgetUtilization,
  calculatePeriodCashFlow,
  LedgerTransactionEntry,
} from './ledger.rules';

export interface TimeSeriesBucket {
  bucket: string;       // e.g. "2026-10-15" or "2026-W42" or "2026-10"
  date?: string;
  incomePaise: number;
  income?: number;
  expensePaise: number;
  expense?: number;
  refundPaise: number;
  netExpensePaise: number;
  netCashFlowPaise: number;
  net?: number;
}

export interface PeriodReportResponse {
  period: string;
  startDate: Date;
  endDate: Date;
  totalIncome?: number;
  totalExpense?: number;
  totalExpenses?: number;
  netCashFlow?: number;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalRefunds: number;
    netOperatingExpense: number;
    netCashFlow: number;
  };
  timeSeries: TimeSeriesBucket[];
}

export interface CategoryTrendItem {
  category: string;
  currentSpendPaise: number;
  amount?: number;
  previousSpendPaise: number;
  deltaPaise: number;
  percentageChange: number;
  monthOverMonthChangePercentage?: number;
  percentageOfCurrentTotal: number;
  percentage?: number;
  transactionCount?: number;
}

export interface FinancialInsightItem {
  type: 'cash_flow_health' | 'unusual_spending' | 'approaching_deadline' | 'budget_alert';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

function getMonthBounds(yearMonth: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10) - 1;

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function getPreviousMonthStr(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  let year = parseInt(yearStr!, 10);
  let month = parseInt(monthStr!, 10) - 1;
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return `${year}-${month.toString().padStart(2, '0')}`;
}

/**
 * Generates aggregated time-series reports for daily, weekly, or monthly periods.
 */
export async function getPeriodReport(
  userId: string,
  query: PeriodReportQuery,
): Promise<PeriodReportResponse> {
  const userObjectId = new Types.ObjectId(userId);
  const period = query.period || 'monthly';

  let startDate: Date;
  let endDate: Date;

  const now = new Date();

  if (query.startDate && query.endDate) {
    startDate = new Date(query.startDate);
    endDate = new Date(query.endDate);
  } else if (query.month) {
    const bounds = getMonthBounds(query.month);
    startDate = bounds.start;
    endDate = bounds.end;
  } else {
    endDate = now;
    if (period === 'daily') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
    } else if (period === 'weekly') {
      startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // 12 weeks
    } else {
      // Monthly: past 6 months
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    }
  }

  const txFilter: any = {
    userId: userObjectId,
    isArchived: false,
    date: { $gte: startDate, $lte: endDate },
  };

  if (query.category && query.category !== 'all') {
    txFilter.category = query.category;
  }

  const transactions = await Transaction.find(txFilter).sort({ date: 1 });

  const ledgerEntries: LedgerTransactionEntry[] = transactions.map((t) => ({
    type: t.type,
    amount: t.amount,
    accountId: t.accountId?.toString(),
    toAccountId: t.toAccountId?.toString(),
    isArchived: t.isArchived,
  }));

  const summary = calculatePeriodCashFlow(ledgerEntries);

  // Group into time-series buckets
  const bucketMap = new Map<string, { income: number; expense: number; refund: number }>();

  for (const tx of transactions) {
    if (tx.type === 'transfer') continue; // internal transfers excluded from cash flow

    let bucketKey: string;
    const d = new Date(tx.date);

    if (period === 'daily') {
      bucketKey = d.toISOString().split('T')[0]!;
    } else if (period === 'weekly') {
      const weekNumber = Math.ceil((d.getUTCDate() + (6 - d.getUTCDay())) / 7);
      bucketKey = `${d.getUTCFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
    } else {
      bucketKey = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    }

    const current = bucketMap.get(bucketKey) || { income: 0, expense: 0, refund: 0 };
    if (tx.type === 'income') current.income += tx.amount;
    if (tx.type === 'expense') current.expense += tx.amount;
    if (tx.type === 'refund') current.refund += tx.amount;
    bucketMap.set(bucketKey, current);
  }

  const timeSeries: TimeSeriesBucket[] = Array.from(bucketMap.entries())
    .map(([bucket, val]) => {
      const netExpensePaise = Math.max(0, val.expense - val.refund);
      return {
        bucket,
        incomePaise: val.income,
        expensePaise: val.expense,
        refundPaise: val.refund,
        netExpensePaise,
        netCashFlowPaise: val.income - netExpensePaise,
      };
    })
    .sort((a, b) => a.bucket.localeCompare(b.bucket));

  return {
    period,
    startDate,
    endDate,
    totalIncome: summary.totalIncome,
    totalExpense: summary.netOperatingExpense,
    totalExpenses: summary.totalExpenses,
    netCashFlow: summary.netCashFlow,
    summary,
    timeSeries: timeSeries.map((t) => ({
      ...t,
      date: t.bucket,
      income: t.incomePaise,
      expense: t.netExpensePaise,
      net: t.netCashFlowPaise,
    })),
  };
}

/**
 * Generates category spending analysis and month-over-month trend comparison.
 */
export async function getCategoryReport(
  userId: string,
  query: CategoryReportQuery,
): Promise<{ month: string; totalSpendPaise: number; totalExpense?: number; categories: CategoryTrendItem[] }> {
  const userObjectId = new Types.ObjectId(userId);

  const now = new Date();
  const currentMonthStr = `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}`;
  const month = query.month || currentMonthStr;
  const previousMonth = getPreviousMonthStr(month);

  const curBounds = getMonthBounds(month);
  const prevBounds = getMonthBounds(previousMonth);

  // Current month transactions
  const curTxFilter: any = {
    userId: userObjectId,
    isArchived: false,
    date: { $gte: curBounds.start, $lte: curBounds.end },
    type: { $in: ['expense', 'refund'] },
  };
  if (query.category && query.category !== 'all') {
    curTxFilter.category = query.category;
  }
  const curTxs = await Transaction.find(curTxFilter);

  // Previous month transactions
  const prevTxFilter: any = {
    userId: userObjectId,
    isArchived: false,
    date: { $gte: prevBounds.start, $lte: prevBounds.end },
    type: { $in: ['expense', 'refund'] },
  };
  if (query.category && query.category !== 'all') {
    prevTxFilter.category = query.category;
  }
  const prevTxs = await Transaction.find(prevTxFilter);

  const curCategoryMap = new Map<string, { expense: number; refund: number }>();
  for (const t of curTxs) {
    const cur = curCategoryMap.get(t.category) || { expense: 0, refund: 0 };
    if (t.type === 'expense') cur.expense += t.amount;
    if (t.type === 'refund') cur.refund += t.amount;
    curCategoryMap.set(t.category, cur);
  }

  const prevCategoryMap = new Map<string, { expense: number; refund: number }>();
  for (const t of prevTxs) {
    const prev = prevCategoryMap.get(t.category) || { expense: 0, refund: 0 };
    if (t.type === 'expense') prev.expense += t.amount;
    if (t.type === 'refund') prev.refund += t.amount;
    prevCategoryMap.set(t.category, prev);
  }

  let totalSpendPaise = 0;
  for (const [, val] of curCategoryMap) {
    totalSpendPaise += Math.max(0, val.expense - val.refund);
  }

  const allCategories = new Set([
    ...curCategoryMap.keys(),
    ...prevCategoryMap.keys(),
  ]);

  const categories: CategoryTrendItem[] = [];

  for (const category of allCategories) {
    const cur = curCategoryMap.get(category) || { expense: 0, refund: 0 };
    const prev = prevCategoryMap.get(category) || { expense: 0, refund: 0 };

    const currentSpendPaise = Math.max(0, cur.expense - cur.refund);
    const previousSpendPaise = Math.max(0, prev.expense - prev.refund);
    const deltaPaise = currentSpendPaise - previousSpendPaise;

    const percentageChange =
      previousSpendPaise > 0
        ? Math.round(((deltaPaise / previousSpendPaise) * 100) * 100) / 100
        : currentSpendPaise > 0
        ? 100
        : 0;

    const percentageOfCurrentTotal =
      totalSpendPaise > 0
        ? Math.round(((currentSpendPaise / totalSpendPaise) * 100) * 100) / 100
        : 0;

    const txCount = curTxs.filter((t) => t.category === category).length;

    categories.push({
      category,
      currentSpendPaise,
      amount: currentSpendPaise,
      previousSpendPaise,
      deltaPaise,
      percentageChange,
      monthOverMonthChangePercentage: percentageChange,
      percentageOfCurrentTotal,
      percentage: percentageOfCurrentTotal,
      transactionCount: txCount,
    });
  }

  categories.sort((a, b) => b.currentSpendPaise - a.currentSpendPaise);
  const limit = query.limit || 10;

  return {
    month,
    totalSpendPaise,
    totalExpense: totalSpendPaise,
    categories: categories.slice(0, limit),
  };
}

/**
 * Generates salary history and growth report.
 */
export async function getSalaryGrowthReport(userId: string): Promise<Record<string, unknown>> {
  const userObjectId = new Types.ObjectId(userId);
  const salary = await Salary.findOne({ userId: userObjectId });
  const credits = await Transaction.find({
    userId: userObjectId,
    category: 'salary',
    type: 'income',
    isArchived: false,
  }).sort({ date: -1 });

  const totalCreditsReceived = credits.reduce((sum, c) => sum + c.amount, 0);

  return {
    configuredSalary: salary?.baseMonthlySalary ?? null,
    currency: salary?.currency ?? 'INR',
    effectiveDate: salary?.effectiveDate ?? null,
    revisions: salary?.revisions ?? [],
    totalCreditsReceivedPaise: totalCreditsReceived,
    totalCreditsCount: credits.length,
    recentDisbursements: credits.slice(0, 5),
  };
}

/**
 * Generates savings goal progress and historical contribution summary.
 */
export async function getSavingsProgressReport(userId: string): Promise<Record<string, unknown>> {
  const userObjectId = new Types.ObjectId(userId);
  const goals = await Goal.find({ userId: userObjectId });
  const contributions = await GoalContribution.find({ userId: userObjectId }).sort({ date: -1 });

  const totalTargetPaise = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSavedPaise = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallPercentage =
    totalTargetPaise > 0
      ? Math.round(((totalSavedPaise / totalTargetPaise) * 100) * 100) / 100
      : 0;

  return {
    totalGoalsCount: goals.length,
    activeGoalsCount: goals.filter((g) => g.status === 'active').length,
    completedGoalsCount: goals.filter((g) => g.status === 'completed').length,
    totalTargetPaise,
    totalSavedPaise,
    overallPercentage,
    totalContributionsCount: contributions.length,
    recentContributions: contributions.slice(0, 5),
  };
}

/**
 * Rule-based deterministic financial insights.
 */
export async function getFinancialInsights(
  userId: string,
  query: InsightsQuery,
): Promise<{ month: string; insights: FinancialInsightItem[] }> {
  const userObjectId = new Types.ObjectId(userId);
  const now = new Date();
  const currentMonthStr = `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}`;
  const month = query.month || currentMonthStr;

  const insights: FinancialInsightItem[] = [];

  // 1. Cash Flow Health
  const { start, end } = getMonthBounds(month);
  const txs = await Transaction.find({
    userId: userObjectId,
    isArchived: false,
    date: { $gte: start, $lte: end },
  });

  const ledgerEntries: LedgerTransactionEntry[] = txs.map((t) => ({
    type: t.type,
    amount: t.amount,
    accountId: t.accountId?.toString(),
    toAccountId: t.toAccountId?.toString(),
    isArchived: t.isArchived,
  }));

  const cashFlow = calculatePeriodCashFlow(ledgerEntries);

  if (cashFlow.netCashFlow > 0) {
    insights.push({
      type: 'cash_flow_health',
      severity: 'info',
      title: 'Positive Cash Flow',
      message: `Great job! You have a cash flow surplus of ₹${(cashFlow.netCashFlow / 100).toLocaleString('en-IN')} this month.`,
      metadata: { netCashFlow: cashFlow.netCashFlow },
    });
  } else if (cashFlow.netCashFlow < 0) {
    insights.push({
      type: 'cash_flow_health',
      severity: 'critical',
      title: 'Cash Flow Deficit',
      message: `Your net operating expenses exceed income by ₹${(Math.abs(cashFlow.netCashFlow) / 100).toLocaleString('en-IN')} this month.`,
      metadata: { netCashFlow: cashFlow.netCashFlow },
    });
  }

  // 2. Unusual Spending Detection
  const categoryReport = await getCategoryReport(userId, { month, limit: 10 });
  for (const cat of categoryReport.categories) {
    // If increased by > 30% and absolute spend is significant (> 50,000 paise / 500 INR)
    if (cat.percentageChange >= 30 && cat.currentSpendPaise >= 50000) {
      insights.push({
        type: 'unusual_spending',
        severity: 'warning',
        title: `Spike in ${cat.category}`,
        message: `Spending in '${cat.category}' increased by ${cat.percentageChange}% compared to last month (+₹${(cat.deltaPaise / 100).toLocaleString('en-IN')}).`,
        metadata: { category: cat.category, deltaPaise: cat.deltaPaise, percentageChange: cat.percentageChange },
      });
    }
  }

  // 3. Approaching Goal Deadlines
  const activeGoals = await Goal.find({ userId: userObjectId, status: 'active' });
  for (const goal of activeGoals) {
    const daysRemaining = Math.ceil(
      (goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const progress = (goal.currentAmount / goal.targetAmount) * 100;

    if (daysRemaining > 0 && daysRemaining <= 30 && progress < 100) {
      insights.push({
        type: 'approaching_deadline',
        severity: progress < 50 ? 'critical' : 'warning',
        title: `Goal Deadline Approaching: ${goal.name}`,
        message: `'${goal.name}' is due in ${daysRemaining} days and is currently ${Math.round(progress)}% complete.`,
        metadata: { goalId: goal._id.toString(), daysRemaining, progress: Math.round(progress) },
      });
    }
  }

  // 4. Budget Overruns
  const budgets = await Budget.find({ userId: userObjectId, month });
  for (const b of budgets) {
    const catTxs = ledgerEntries.filter(
      (_, idx) => txs[idx]?.category === b.category,
    );
    const util = calculateBudgetUtilization(b.amount, b.alertThreshold, catTxs);

    if (util.isExceeded) {
      insights.push({
        type: 'budget_alert',
        severity: 'critical',
        title: `Budget Exceeded: ${b.category}`,
        message: `You have exceeded your ${b.category} budget by ₹${(Math.abs(util.remainingPaise) / 100).toLocaleString('en-IN')} (${util.utilizationPercentage}% utilized).`,
        metadata: { category: b.category, utilizationPercentage: util.utilizationPercentage },
      });
    } else if (util.isAlertTriggered) {
      insights.push({
        type: 'budget_alert',
        severity: 'warning',
        title: `Budget Warning: ${b.category}`,
        message: `You have utilized ${util.utilizationPercentage}% of your ${b.category} budget (threshold: ${b.alertThreshold}%).`,
        metadata: { category: b.category, utilizationPercentage: util.utilizationPercentage },
      });
    }
  }

  return {
    month,
    insights,
  };
}
