import { Request, Response, NextFunction } from 'express';
import * as transactionService from '../services/transaction.service';
import { sendSuccess } from '../utils/response';
import {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from '../validators/transaction.validators';

export async function createTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = req.body as CreateTransactionInput;
    const { transaction, isDuplicate } = await transactionService.createTransaction(
      userId,
      input,
    );

    sendSuccess(
      res,
      { transaction },
      isDuplicate ? 200 : 201,
      isDuplicate ? { duplicate: true } : undefined,
    );
  } catch (err) {
    next(err);
  }
}

export async function listTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = req.query as unknown as ListTransactionsQuery;
    const result = await transactionService.listTransactions(userId, query);

    sendSuccess(res, { transactions: result.transactions }, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const transaction = await transactionService.getTransactionById(userId, id as string);

    sendSuccess(res, { transaction }, 200);
  } catch (err) {
    next(err);
  }
}

export async function updateTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const input = req.body as UpdateTransactionInput;
    const transaction = await transactionService.updateTransaction(
      userId,
      id as string,
      input,
    );

    sendSuccess(res, { transaction }, 200);
  } catch (err) {
    next(err);
  }
}

export async function deleteTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await transactionService.deleteTransaction(userId, id as string);

    sendSuccess(res, { message: 'Transaction deleted successfully' }, 200);
  } catch (err) {
    next(err);
  }
}
