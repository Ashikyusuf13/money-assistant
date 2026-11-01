import { Types } from 'mongoose';
import {
  Account,
  Goal,
  GoalContribution,
  IGoalContributionDocument,
  IGoalDocument,
  Transaction,
} from '../models';
import { NotFoundError, ValidationError } from '../errors';
import {
  CreateContributionInput,
  CreateGoalInput,
  ListGoalsQuery,
  UpdateGoalInput,
} from '../validators/goal.validators';
import { calculateGoalProgress } from './ledger.rules';

export interface EnrichedGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentage: number;
  progressPercentage?: number;
  targetDate: Date;
  priority: string;
  category?: string;
  status: string;
  notes?: string;
  monthsRemaining: number;
  requiredMonthlyContributionPaise: number;
  monthlyPaceRequired?: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalDetailResponse extends EnrichedGoal {
  contributions: IGoalContributionDocument[];
}

function calculatePace(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date,
): { monthsRemaining: number; requiredMonthlyContributionPaise: number } {
  const now = new Date();
  const remainingPaise = Math.max(0, targetAmount - currentAmount);

  const yearDiff = targetDate.getFullYear() - now.getFullYear();
  const monthDiff = targetDate.getMonth() - now.getMonth();
  const monthsRemaining = Math.max(1, yearDiff * 12 + monthDiff);

  const requiredMonthlyContributionPaise =
    remainingPaise > 0 ? Math.ceil(remainingPaise / monthsRemaining) : 0;

  return { monthsRemaining, requiredMonthlyContributionPaise };
}

function enrichGoalDoc(goal: IGoalDocument): EnrichedGoal {
  const { currentAmount, targetAmount, targetDate } = goal;
  const progress = calculateGoalProgress(targetAmount, [
    { type: 'contribution', amount: currentAmount },
  ]);
  const pace = calculatePace(targetAmount, currentAmount, targetDate);

  return {
    id: goal._id.toString(),
    userId: goal.userId.toString(),
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    remainingAmount: progress.remainingAmount,
    percentage: progress.percentage,
    progressPercentage: progress.percentage,
    targetDate: goal.targetDate,
    priority: goal.priority,
    category: goal.category,
    status: goal.status,
    notes: goal.notes,
    monthsRemaining: pace.monthsRemaining,
    requiredMonthlyContributionPaise: pace.requiredMonthlyContributionPaise,
    monthlyPaceRequired: pace.requiredMonthlyContributionPaise,
    isCompleted: goal.status === 'completed' || progress.isCompleted,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

/**
 * Creates a new savings goal.
 */
export async function createGoal(
  userId: string,
  input: CreateGoalInput,
): Promise<EnrichedGoal> {
  const userObjectId = new Types.ObjectId(userId);

  const goal = await Goal.create({
    userId: userObjectId,
    name: input.name,
    targetAmount: input.targetAmount,
    targetDate: new Date(input.targetDate),
    priority: input.priority || 'medium',
    category: input.category,
    notes: input.notes,
    currentAmount: 0,
    status: 'active',
  });

  return enrichGoalDoc(goal);
}

/**
 * Lists all goals with pace and progress calculations.
 */
export async function listGoals(
  userId: string,
  query: ListGoalsQuery,
): Promise<EnrichedGoal[]> {
  const userObjectId = new Types.ObjectId(userId);
  const filter: Record<string, unknown> = { userId: userObjectId };

  if (query.status) filter['status'] = query.status;
  if (query.priority) filter['priority'] = query.priority;

  const goals = await Goal.find(filter).sort({ targetDate: 1 });
  return goals.map(enrichGoalDoc);
}

/**
 * Retrieves a single goal along with its complete contribution history.
 */
export async function getGoalById(
  userId: string,
  goalId: string,
): Promise<GoalDetailResponse> {
  const userObjectId = new Types.ObjectId(userId);
  const goalObjectId = new Types.ObjectId(goalId);

  const goal = await Goal.findOne({ _id: goalObjectId, userId: userObjectId });
  if (!goal) {
    throw new NotFoundError('Savings goal not found');
  }

  const contributions = await GoalContribution.find({
    goalId: goalObjectId,
    userId: userObjectId,
  }).sort({ date: -1 });

  return {
    ...enrichGoalDoc(goal),
    contributions,
  };
}

/**
 * Updates an existing goal.
 */
export async function updateGoal(
  userId: string,
  goalId: string,
  input: UpdateGoalInput,
): Promise<EnrichedGoal> {
  const userObjectId = new Types.ObjectId(userId);
  const goal = await Goal.findOne({
    _id: new Types.ObjectId(goalId),
    userId: userObjectId,
  });

  if (!goal) {
    throw new NotFoundError('Savings goal not found');
  }

  if (input.name !== undefined) goal.name = input.name;
  if (input.targetAmount !== undefined) goal.targetAmount = input.targetAmount;
  if (input.targetDate !== undefined) goal.targetDate = new Date(input.targetDate);
  if (input.priority !== undefined) goal.priority = input.priority;
  if (input.category !== undefined) goal.category = input.category;
  if (input.notes !== undefined) goal.notes = input.notes;
  if (input.status !== undefined) goal.status = input.status;

  // Auto-check completion if targetAmount changed
  if (goal.status !== 'archived') {
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
    } else if (goal.status === 'completed' && goal.currentAmount < goal.targetAmount) {
      goal.status = 'active';
    }
  }

  await goal.save();
  return enrichGoalDoc(goal);
}

/**
 * Deletes a goal and cleans up its associated contribution records.
 */
export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const userObjectId = new Types.ObjectId(userId);
  const goalObjectId = new Types.ObjectId(goalId);

  const goal = await Goal.findOne({ _id: goalObjectId, userId: userObjectId });
  if (!goal) {
    throw new NotFoundError('Savings goal not found');
  }

  await Promise.all([
    Goal.deleteOne({ _id: goalObjectId }),
    GoalContribution.deleteMany({ goalId: goalObjectId }),
  ]);
}

/**
 * Records a contribution or withdrawal toward a goal.
 * If funded from an account, moves money via an internal transfer so it does NOT inflate expenses.
 */
export async function recordContribution(
  userId: string,
  goalId: string,
  input: CreateContributionInput,
): Promise<{ goal: EnrichedGoal; contribution: IGoalContributionDocument }> {
  const userObjectId = new Types.ObjectId(userId);
  const goalObjectId = new Types.ObjectId(goalId);

  const goal = await Goal.findOne({ _id: goalObjectId, userId: userObjectId });
  if (!goal) {
    throw new NotFoundError('Savings goal not found');
  }

  const type = input.type || 'contribution';

  // Validate withdrawal cannot exceed accumulated goal amount
  if (type === 'withdrawal' && input.amount > goal.currentAmount) {
    throw new ValidationError(
      'Withdrawal amount exceeds accumulated savings for this goal',
      [
        {
          path: ['amount'],
          message: `Cannot withdraw ${input.amount} paise; accumulated savings is only ${goal.currentAmount} paise.`,
        },
      ],
    );
  }

  let transactionId: Types.ObjectId | undefined;

  // If funded from a tracked account, update the account balance and record an internal transfer
  if (input.fromAccountId) {
    const accountObjectId = new Types.ObjectId(input.fromAccountId);
    const account = await Account.findOne({
      _id: accountObjectId,
      userId: userObjectId,
      isArchived: false,
    });

    if (!account) {
      throw new NotFoundError('Funding account not found');
    }

    const delta = type === 'contribution' ? -input.amount : input.amount;
    await Account.updateOne(
      { _id: accountObjectId },
      { $inc: { currentBalance: delta } },
    );

    // Create internal transfer transaction (not an expense)
    const tx = await Transaction.create({
      userId: userObjectId,
      type: 'transfer',
      amount: input.amount,
      category: 'savings_transfer',
      description:
        type === 'contribution'
          ? `Savings Allocation: ${goal.name}`
          : `Savings Withdrawal: ${goal.name}`,
      accountId: accountObjectId,
      date: input.date ? new Date(input.date) : new Date(),
    });
    transactionId = tx._id;
  }

  // Create contribution document
  const contribution = await GoalContribution.create({
    userId: userObjectId,
    goalId: goalObjectId,
    type,
    amount: input.amount,
    date: input.date ? new Date(input.date) : new Date(),
    fromAccountId: input.fromAccountId
      ? new Types.ObjectId(input.fromAccountId)
      : undefined,
    transactionId,
    notes: input.notes,
  });

  // Update goal accumulated amount
  if (type === 'contribution') {
    goal.currentAmount += input.amount;
  } else {
    goal.currentAmount -= input.amount;
  }

  // Auto-status progression
  if (goal.status !== 'archived') {
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
    } else if (goal.status === 'completed' && goal.currentAmount < goal.targetAmount) {
      goal.status = 'active';
    }
  }

  await goal.save();

  return {
    goal: enrichGoalDoc(goal),
    contribution,
  };
}

/**
 * Retrieves contribution history for a specific goal.
 */
export async function getGoalContributions(
  userId: string,
  goalId: string,
): Promise<IGoalContributionDocument[]> {
  const userObjectId = new Types.ObjectId(userId);
  const goalObjectId = new Types.ObjectId(goalId);

  const goal = await Goal.findOne({ _id: goalObjectId, userId: userObjectId });
  if (!goal) {
    throw new NotFoundError('Savings goal not found');
  }

  return GoalContribution.find({
    goalId: goalObjectId,
    userId: userObjectId,
  }).sort({ date: -1 });
}
