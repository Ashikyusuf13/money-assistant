import { Types } from 'mongoose';
import { Budget, IBudgetDocument, Transaction, ITransactionDocument } from '../models';
import { ConflictError, NotFoundError } from '../errors';
import {
  CreateBudgetInput,
  UpdateBudgetInput,
} from '../validators/budget.validators';
import {
  calculateBudgetUtilization,
  BudgetUtilizationResult,
  LedgerTransactionEntry,
} from './ledger.rules';

export interface EnrichedBudget extends BudgetUtilizationResult {
  id: string;
  userId: string;
  category: string;
  month: string;
  alertThreshold: number;
  notes?: string;
  amount?: number;
  spent?: number;
  remaining?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetAlertItem extends EnrichedBudget {
  severity: 'warning' | 'critical';
  message: string;
}

export interface BudgetDetailResponse extends EnrichedBudget {
  transactions: ITransactionDocument[];
}

function getMonthBounds(yearMonth: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10) - 1;

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

/**
 * Creates a budget ensuring uniqueness per user, category, and month.
 */
export async function createBudget(
  userId: string,
  input: CreateBudgetInput,
): Promise<IBudgetDocument> {
  const userObjectId = new Types.ObjectId(userId);
  const category = input.category.toLowerCase().trim();

  const existing = await Budget.findOne({
    userId: userObjectId,
    category,
    month: input.month,
  });

  if (existing) {
    throw new ConflictError(
      `A budget for category '${category}' already exists for month '${input.month}'`,
    );
  }

  const budget = await Budget.create({
    userId: userObjectId,
    category,
    amount: input.amount,
    month: input.month,
    alertThreshold: input.alertThreshold ?? 80,
    notes: input.notes,
  });

  return budget;
}

/**
 * Lists all budgets for a given month with real-time spending and utilization calculations.
 */
export async function listBudgetsWithUtilization(
  userId: string,
  selectedMonth?: string,
  categoryFilter?: string,
): Promise<EnrichedBudget[]> {
  const userObjectId = new Types.ObjectId(userId);

  const now = new Date();
  const currentMonthStr = `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}`;
  const month = selectedMonth || currentMonthStr;

  const filter: Record<string, unknown> = {
    userId: userObjectId,
    month,
  };

  if (categoryFilter) {
    filter['category'] = categoryFilter.toLowerCase().trim();
  }

  const budgets = await Budget.find(filter).sort({ category: 1 });
  if (budgets.length === 0) return [];

  const { start, end } = getMonthBounds(month);

  // Fetch all transactions for this user within this month
  const transactions = await Transaction.find({
    userId: userObjectId,
    isArchived: false,
    date: { $gte: start, $lte: end },
    type: { $in: ['expense', 'refund'] },
  });

  return budgets.map((b) => {
    const bCat = (b.category || '').toLowerCase().trim();
    const categoryEntries: LedgerTransactionEntry[] = transactions
      .filter((t) => (t.category || '').toLowerCase().trim() === bCat)
      .map((t) => ({
        type: t.type,
        amount: t.amount,
        isArchived: t.isArchived,
      }));

    const util = calculateBudgetUtilization(b.amount, b.alertThreshold, categoryEntries);

    return {
      id: b._id.toString(),
      userId: b.userId.toString(),
      category: b.category,
      month: b.month,
      alertThreshold: b.alertThreshold,
      notes: b.notes,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      budgetAmount: util.budgetAmount,
      amount: util.budgetAmount,
      spentPaise: util.spentPaise,
      spent: util.spentPaise,
      remainingPaise: util.remainingPaise,
      remaining: util.remainingPaise,
      utilizationPercentage: util.utilizationPercentage,
      isExceeded: util.isExceeded,
      isAlertTriggered: util.isAlertTriggered,
    };
  });
}

/**
 * Retrieves a single budget with utilization and the list of matching transactions.
 */
export async function getBudgetById(
  userId: string,
  budgetId: string,
): Promise<BudgetDetailResponse> {
  const userObjectId = new Types.ObjectId(userId);
  const budget = await Budget.findOne({
    _id: new Types.ObjectId(budgetId),
    userId: userObjectId,
  });

  if (!budget) {
    throw new NotFoundError('Budget not found');
  }

  const { start, end } = getMonthBounds(budget.month);

  const transactions = await Transaction.find({
    userId: userObjectId,
    category: { $regex: new RegExp(`^${budget.category.trim()}$`, 'i') },
    isArchived: false,
    date: { $gte: start, $lte: end },
    type: { $in: ['expense', 'refund'] },
  }).sort({ date: -1 });

  const ledgerEntries: LedgerTransactionEntry[] = transactions.map((t) => ({
    type: t.type,
    amount: t.amount,
    isArchived: t.isArchived,
  }));

  const util = calculateBudgetUtilization(
    budget.amount,
    budget.alertThreshold,
    ledgerEntries,
  );

  return {
    id: budget._id.toString(),
    userId: budget.userId.toString(),
    category: budget.category,
    month: budget.month,
    alertThreshold: budget.alertThreshold,
    notes: budget.notes,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
    budgetAmount: util.budgetAmount,
    amount: util.budgetAmount,
    spentPaise: util.spentPaise,
    spent: util.spentPaise,
    remainingPaise: util.remainingPaise,
    remaining: util.remainingPaise,
    utilizationPercentage: util.utilizationPercentage,
    isExceeded: util.isExceeded,
    isAlertTriggered: util.isAlertTriggered,
    transactions,
  };
}

/**
 * Updates an existing budget's limit amount, alert threshold, or notes.
 */
export async function updateBudget(
  userId: string,
  budgetId: string,
  input: UpdateBudgetInput,
): Promise<EnrichedBudget> {
  const userObjectId = new Types.ObjectId(userId);
  const budget = await Budget.findOne({
    _id: new Types.ObjectId(budgetId),
    userId: userObjectId,
  });

  if (!budget) {
    throw new NotFoundError('Budget not found');
  }

  if (input.amount !== undefined) budget.amount = input.amount;
  if (input.alertThreshold !== undefined) budget.alertThreshold = input.alertThreshold;
  if (input.notes !== undefined) budget.notes = input.notes;

  await budget.save();

  const details = await getBudgetById(userId, budgetId);
  return details;
}

/**
 * Deletes a budget record.
 */
export async function deleteBudget(
  userId: string,
  budgetId: string,
): Promise<void> {
  const userObjectId = new Types.ObjectId(userId);
  const result = await Budget.deleteOne({
    _id: new Types.ObjectId(budgetId),
    userId: userObjectId,
  });

  if (result.deletedCount === 0) {
    throw new NotFoundError('Budget not found');
  }
}

/**
 * Evaluates rule-based alerts for all budgets in the given month.
 * Returns budgets that reached or exceeded their alert thresholds with severity level.
 */
export async function getBudgetAlerts(
  userId: string,
  monthStr?: string,
): Promise<BudgetAlertItem[]> {
  const enriched = await listBudgetsWithUtilization(userId, monthStr);
  const triggered = enriched.filter((b) => b.isAlertTriggered);

  return triggered.map((b) => {
    const isCritical = b.isExceeded || b.utilizationPercentage >= 100;
    const severity: 'warning' | 'critical' = isCritical ? 'critical' : 'warning';
    const message = isCritical
      ? `Budget exceeded for category '${b.category}'. Utilization is ${b.utilizationPercentage}%.`
      : `Warning: Spending in category '${b.category}' has reached ${b.utilizationPercentage}%, surpassing alert threshold of ${b.alertThreshold}%.`;

    return {
      ...b,
      severity,
      message,
    };
  });
}
