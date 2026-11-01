import { Request, Response, NextFunction } from 'express';
import * as budgetService from '../services/budget.service';
import { sendSuccess } from '../utils/response';
import {
  CreateBudgetInput,
  ListBudgetsQuery,
  UpdateBudgetInput,
} from '../validators/budget.validators';

export async function createBudget(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = req.body as CreateBudgetInput;
    const budget = await budgetService.createBudget(userId, input);

    sendSuccess(res, { budget }, 201);
  } catch (err) {
    next(err);
  }
}

export async function listBudgets(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = req.query as unknown as ListBudgetsQuery;
    const budgets = await budgetService.listBudgetsWithUtilization(
      userId,
      query.month,
      query.category,
    );

    sendSuccess(res, { budgets }, 200);
  } catch (err) {
    next(err);
  }
}

export async function getBudget(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const budget = await budgetService.getBudgetById(userId, id as string);

    sendSuccess(res, { budget }, 200);
  } catch (err) {
    next(err);
  }
}

export async function updateBudget(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const input = req.body as UpdateBudgetInput;
    const budget = await budgetService.updateBudget(userId, id as string, input);

    sendSuccess(res, { budget }, 200);
  } catch (err) {
    next(err);
  }
}

export async function deleteBudget(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await budgetService.deleteBudget(userId, id as string);

    sendSuccess(res, { message: 'Budget deleted successfully' }, 200);
  } catch (err) {
    next(err);
  }
}

export async function getBudgetAlerts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = req.query as unknown as ListBudgetsQuery;
    const alerts = await budgetService.getBudgetAlerts(userId, query.month);

    sendSuccess(res, { alerts }, 200);
  } catch (err) {
    next(err);
  }
}
