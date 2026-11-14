import { FilterQuery, Types } from 'mongoose';
import { Account, ITransactionDocument, Transaction, CustomCategory } from '../models';
import { NotFoundError } from '../errors';
import {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from '../validators/transaction.validators';

export interface PaginatedTransactionsResult {
  transactions: ITransactionDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Helper to adjust account balance for a given transaction effect.
 * Income / Refund: +amount to accountId
 * Expense: -amount from accountId
 * Transfer: -amount from accountId, +amount to toAccountId
 */
async function applyBalanceEffect(
  userId: string,
  type: string,
  amount: number,
  accountId?: Types.ObjectId | string,
  toAccountId?: Types.ObjectId | string,
  multiplier = 1, // 1 to apply, -1 to revert
): Promise<void> {
  const delta = amount * multiplier;

  if (accountId) {
    if (type === 'income' || type === 'refund') {
      await Account.updateOne(
        { _id: accountId, userId: new Types.ObjectId(userId) },
        { $inc: { currentBalance: delta } },
      );
    } else if (type === 'expense' || type === 'transfer') {
      await Account.updateOne(
        { _id: accountId, userId: new Types.ObjectId(userId) },
        { $inc: { currentBalance: -delta } },
      );
    }
  }

  if (toAccountId && type === 'transfer') {
    await Account.updateOne(
      { _id: toAccountId, userId: new Types.ObjectId(userId) },
      { $inc: { currentBalance: delta } },
    );
  }
}

/**
 * Creates a new transaction with idempotency and account balance update.
 */
export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<{ transaction: ITransactionDocument; isDuplicate: boolean }> {
  const userObjectId = new Types.ObjectId(userId);

  // 1. Idempotency Check
  if (input.idempotencyKey) {
    const existing = await Transaction.findOne({
      userId: userObjectId,
      idempotencyKey: input.idempotencyKey,
      isArchived: false,
    });

    if (existing) {
      return { transaction: existing, isDuplicate: true };
    }
  }

  // 2. Validate Accounts Ownership
  let accountObjectId: Types.ObjectId | undefined;
  let toAccountObjectId: Types.ObjectId | undefined;

  if (input.accountId) {
    accountObjectId = new Types.ObjectId(input.accountId);
    const account = await Account.findOne({
      _id: accountObjectId,
      userId: userObjectId,
      isArchived: false,
    });
    if (!account) {
      throw new NotFoundError('Source account not found');
    }
  } else if (input.type !== 'transfer') {
    // Fallback to user's first active account so balance is always tracked
    const defaultAcc = await Account.findOne({
      userId: userObjectId,
      isArchived: false,
    }).sort({ createdAt: 1 });
    if (defaultAcc) {
      accountObjectId = defaultAcc._id;
    }
  }

  if (input.toAccountId) {
    toAccountObjectId = new Types.ObjectId(input.toAccountId);
    const toAccount = await Account.findOne({
      _id: toAccountObjectId,
      userId: userObjectId,
      isArchived: false,
    });
    if (!toAccount) {
      throw new NotFoundError('Destination account not found');
    }
  }

  // 3. Validate Refund Original Transaction Ownership if present
  let originalTxObjectId: Types.ObjectId | undefined;
  if (input.originalTransactionId) {
    originalTxObjectId = new Types.ObjectId(input.originalTransactionId);
    const originalTx = await Transaction.findOne({
      _id: originalTxObjectId,
      userId: userObjectId,
      isArchived: false,
    });
    if (!originalTx) {
      throw new NotFoundError('Original transaction for refund not found');
    }
  }

  // 4. Determine Transaction Date (use current timestamp if recorded for today)
  let txDate = new Date();
  if (input.date) {
    const parsed = new Date(input.date);
    const todayStr = txDate.toISOString().split('T')[0];
    const parsedStr = !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : '';
    if (parsedStr && parsedStr !== todayStr) {
      txDate = parsed;
    }
  }

  // 4. Create Transaction
  const normalizedCategory = input.category.toLowerCase().trim();
  const transaction = await Transaction.create({
    userId: userObjectId,
    type: input.type,
    amount: input.amount,
    date: txDate,
    category: normalizedCategory,
    description: input.description,
    accountId: accountObjectId,
    toAccountId: toAccountObjectId,
    originalTransactionId: originalTxObjectId,
    tags: input.tags ?? [],
    notes: input.notes,
    idempotencyKey: input.idempotencyKey,
  });

  // Automatically register custom categories for the user
  const STANDARD_CATEGORIES = new Set([
    'food',
    'groceries',
    'transport',
    'shopping',
    'bills',
    'utilities',
    'health',
    'entertainment',
    'investment',
    'salary',
    'bonus',
    'transfer',
    'refund',
    'other',
    'others',
  ]);
  if (!STANDARD_CATEGORIES.has(normalizedCategory)) {
    try {
      await CustomCategory.updateOne(
        { userId: userObjectId, name: normalizedCategory },
        { $setOnInsert: { userId: userObjectId, name: normalizedCategory } },
        { upsert: true },
      );
    } catch {
      // Ignore concurrent upsert errors
    }
  }

  // 5. Update Account Balance
  await applyBalanceEffect(
    userId,
    input.type,
    input.amount,
    accountObjectId,
    toAccountObjectId,
    1,
  );

  return { transaction, isDuplicate: false };
}

/**
 * Lists transactions with filtering, date ranges, and pagination.
 */
export async function listTransactions(
  userId: string,
  query: ListTransactionsQuery,
): Promise<PaginatedTransactionsResult> {
  const userObjectId = new Types.ObjectId(userId);
  const filter: FilterQuery<ITransactionDocument> = {
    userId: userObjectId,
    isArchived: false,
  };

  if (query.type) {
    filter.type = query.type;
  }

  if (query.category) {
    filter.category = query.category.toLowerCase();
  }

  if (query.accountId) {
    filter.accountId = new Types.ObjectId(query.accountId);
  }

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) {
      filter.date.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filter.date.$lte = new Date(query.endDate);
    }
  }

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    filter.amount = {};
    if (query.minAmount !== undefined) {
      filter.amount.$gte = query.minAmount;
    }
    if (query.maxAmount !== undefined) {
      filter.amount.$lte = query.maxAmount;
    }
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { description: { $regex: escaped, $options: 'i' } },
      { notes: { $regex: escaped, $options: 'i' } },
    ];
  }

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
  const sortOptions: Record<string, 1 | -1> = {
    [query.sortBy]: sortDirection,
    createdAt: sortDirection,
    _id: sortDirection,
  };

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .select('description amount type category date accountId toAccountId originalTransactionId createdAt')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as unknown as Promise<ITransactionDocument[]>,
    Transaction.countDocuments(filter).exec(),
  ]);

  return {
    transactions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Retrieves a single transaction by ID, scoped to user.
 */
export async function getTransactionById(
  userId: string,
  transactionId: string,
): Promise<ITransactionDocument> {
  const transaction = await Transaction.findOne({
    _id: new Types.ObjectId(transactionId),
    userId: new Types.ObjectId(userId),
    isArchived: false,
  });

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  return transaction;
}

/**
 * Updates a transaction and adjusts account balances accordingly.
 */
export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput,
): Promise<ITransactionDocument> {
  const userObjectId = new Types.ObjectId(userId);
  const txObjectId = new Types.ObjectId(transactionId);

  const transaction = await Transaction.findOne({
    _id: txObjectId,
    userId: userObjectId,
    isArchived: false,
  });

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  // Check account ownership if updating accounts
  let targetAccountId = transaction.accountId;
  if (input.accountId !== undefined) {
    targetAccountId = new Types.ObjectId(input.accountId);
    const acc = await Account.findOne({
      _id: targetAccountId,
      userId: userObjectId,
      isArchived: false,
    });
    if (!acc) throw new NotFoundError('Account not found');
  }

  let targetToAccountId = transaction.toAccountId;
  if (input.toAccountId !== undefined) {
    targetToAccountId = new Types.ObjectId(input.toAccountId);
    const toAcc = await Account.findOne({
      _id: targetToAccountId,
      userId: userObjectId,
      isArchived: false,
    });
    if (!toAcc) throw new NotFoundError('Destination account not found');
  }

  const newAmount = input.amount !== undefined ? input.amount : transaction.amount;

  // Revert old effect
  await applyBalanceEffect(
    userId,
    transaction.type,
    transaction.amount,
    transaction.accountId,
    transaction.toAccountId,
    -1,
  );

  // Apply new effect
  await applyBalanceEffect(
    userId,
    transaction.type,
    newAmount,
    targetAccountId,
    targetToAccountId,
    1,
  );

  // Update transaction fields
  if (input.amount !== undefined) transaction.amount = input.amount;
  if (input.date !== undefined) transaction.date = new Date(input.date);
  if (input.category !== undefined) transaction.category = input.category.toLowerCase();
  if (input.description !== undefined) transaction.description = input.description;
  if (input.accountId !== undefined) transaction.accountId = targetAccountId;
  if (input.toAccountId !== undefined) transaction.toAccountId = targetToAccountId;
  if (input.tags !== undefined) transaction.tags = input.tags;
  if (input.notes !== undefined) transaction.notes = input.notes;

  await transaction.save();

  return transaction;
}

/**
 * Soft deletes/archives a transaction and reverses its balance impact.
 */
export async function deleteTransaction(
  userId: string,
  transactionId: string,
): Promise<void> {
  const transaction = await Transaction.findOne({
    _id: new Types.ObjectId(transactionId),
    userId: new Types.ObjectId(userId),
    isArchived: false,
  });

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  // Reverse balance effect
  await applyBalanceEffect(
    userId,
    transaction.type,
    transaction.amount,
    transaction.accountId,
    transaction.toAccountId,
    -1,
  );

  transaction.isArchived = true;
  await transaction.save();
}
