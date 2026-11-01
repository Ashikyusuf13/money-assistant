import { Types } from 'mongoose';
import { ISalaryDocument, Salary, Transaction, ITransactionDocument } from '../models';
import { NotFoundError, ValidationError } from '../errors';
import {
  AddSalaryRevisionInput,
  RecordSalaryCreditInput,
  SetupSalaryInput,
} from '../validators/salary.validators';
import { createTransaction } from './transaction.service';

export interface SalaryComparisonResult {
  currentSalary: number;
  initialSalary: number;
  previousSalary: number;
  absoluteIncreasePaise: number;
  percentageIncrease: number;
  totalLifetimeGrowthPaise: number;
  totalLifetimeGrowthPercentage: number;
  growthPercentage?: number;
  totalRevisions: number;
  revisionCount?: number;
  revisions: ISalaryDocument['revisions'];
}

/**
 * Retrieves the current salary profile for a user.
 */
export async function getSalaryProfile(
  userId: string,
): Promise<ISalaryDocument | null> {
  return Salary.findOne({ userId: new Types.ObjectId(userId) });
}

/**
 * Sets up or updates the base salary profile.
 */
export async function setupSalary(
  userId: string,
  input: SetupSalaryInput,
): Promise<ISalaryDocument> {
  const userObjectId = new Types.ObjectId(userId);

  let salary = await Salary.findOne({ userId: userObjectId });

  if (salary) {
    salary.baseMonthlySalary = input.baseMonthlySalary;
    if (input.effectiveDate) salary.effectiveDate = new Date(input.effectiveDate);
    if (input.currency) salary.currency = input.currency.toUpperCase();
    if (input.notes !== undefined) salary.notes = input.notes;
    await salary.save();
  } else {
    salary = await Salary.create({
      userId: userObjectId,
      baseMonthlySalary: input.baseMonthlySalary,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : new Date(),
      currency: input.currency?.toUpperCase() || 'INR',
      notes: input.notes,
      revisions: [],
    });
  }

  return salary;
}

/**
 * Adds an increment or salary revision to the history.
 * IMPORTANT: A revision does NOT create transactions or modify account balances.
 */
export async function addSalaryRevision(
  userId: string,
  input: AddSalaryRevisionInput,
): Promise<ISalaryDocument> {
  const userObjectId = new Types.ObjectId(userId);
  const salary = await Salary.findOne({ userId: userObjectId });

  if (!salary) {
    throw new NotFoundError(
      'Salary profile not configured. Please setup your base salary first.',
    );
  }

  const previousSalary = salary.baseMonthlySalary;
  const effectiveDate = new Date(input.effectiveDate);

  salary.revisions.push({
    previousSalary,
    revisedSalary: input.revisedSalary,
    effectiveDate,
    notes: input.notes,
    createdAt: new Date(),
  });

  salary.baseMonthlySalary = input.revisedSalary;
  salary.effectiveDate = effectiveDate;

  await salary.save();
  return salary;
}

/**
 * Compares current salary against historical increments and computes growth metrics.
 */
export async function getSalaryComparison(
  userId: string,
): Promise<SalaryComparisonResult> {
  const userObjectId = new Types.ObjectId(userId);
  const salary = await Salary.findOne({ userId: userObjectId });

  if (!salary) {
    throw new NotFoundError('Salary profile not found');
  }

  const currentSalary = salary.baseMonthlySalary;
  const revisions = salary.revisions;
  const totalRevisions = revisions.length;

  const initialSalary =
    totalRevisions > 0 && revisions[0]
      ? revisions[0].previousSalary
      : currentSalary;

  const previousSalary =
    totalRevisions > 0 && revisions[totalRevisions - 1]
      ? revisions[totalRevisions - 1]!.previousSalary
      : currentSalary;

  const absoluteIncreasePaise = currentSalary - previousSalary;
  const percentageIncrease =
    previousSalary > 0
      ? Math.round(((absoluteIncreasePaise / previousSalary) * 100) * 100) / 100
      : 0;

  const totalLifetimeGrowthPaise = currentSalary - initialSalary;
  const totalLifetimeGrowthPercentage =
    initialSalary > 0
      ? Math.round(((totalLifetimeGrowthPaise / initialSalary) * 100) * 100) / 100
      : 0;

  return {
    currentSalary,
    initialSalary,
    previousSalary,
    absoluteIncreasePaise,
    percentageIncrease,
    totalLifetimeGrowthPaise,
    totalLifetimeGrowthPercentage,
    growthPercentage: totalLifetimeGrowthPercentage,
    totalRevisions,
    revisionCount: totalRevisions,
    revisions,
  };
}

/**
 * Records an actual salary disbursement payment into an account as an income transaction.
 */
export async function recordSalaryCredit(
  userId: string,
  input: RecordSalaryCreditInput,
): Promise<{ transaction: ITransactionDocument; isDuplicate: boolean }> {
  const userObjectId = new Types.ObjectId(userId);

  let creditAmount = input.amount;

  if (!creditAmount) {
    const salary = await Salary.findOne({ userId: userObjectId });
    if (!salary) {
      throw new ValidationError(
        'Salary profile not setup. Please provide an explicit amount or setup your salary profile first.',
        [{ path: ['amount'], message: 'Amount is required when salary profile is not setup' }],
      );
    }
    creditAmount = salary.baseMonthlySalary;
  }

  return createTransaction(userId, {
    type: 'income',
    amount: creditAmount,
    category: 'salary',
    description: input.description || 'Monthly Salary Credit',
    accountId: input.accountId,
    date: input.date,
    notes: input.notes,
    idempotencyKey: input.idempotencyKey,
  });
}

/**
 * Retrieves the history of actual salary payment credits for the user.
 */
export async function getSalaryCreditsHistory(
  userId: string,
): Promise<ITransactionDocument[]> {
  return Transaction.find({
    userId: new Types.ObjectId(userId),
    category: 'salary',
    type: 'income',
    isArchived: false,
  }).sort({ date: -1 });
}
