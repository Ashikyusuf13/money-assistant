import { Request, Response, NextFunction } from 'express';
import * as goalService from '../services/goal.service';
import { sendSuccess } from '../utils/response';
import {
  CreateContributionInput,
  CreateGoalInput,
  ListGoalsQuery,
  UpdateGoalInput,
} from '../validators/goal.validators';

export async function createGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = req.body as CreateGoalInput;
    const goal = await goalService.createGoal(userId, input);

    sendSuccess(res, { goal }, 201);
  } catch (err) {
    next(err);
  }
}

export async function listGoals(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = req.query as unknown as ListGoalsQuery;
    const goals = await goalService.listGoals(userId, query);

    sendSuccess(res, { goals }, 200);
  } catch (err) {
    next(err);
  }
}

export async function getGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const goal = await goalService.getGoalById(userId, id as string);

    sendSuccess(res, { goal }, 200);
  } catch (err) {
    next(err);
  }
}

export async function updateGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const input = req.body as UpdateGoalInput;
    const goal = await goalService.updateGoal(userId, id as string, input);

    sendSuccess(res, { goal }, 200);
  } catch (err) {
    next(err);
  }
}

export async function deleteGoal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await goalService.deleteGoal(userId, id as string);

    sendSuccess(res, { message: 'Goal deleted successfully' }, 200);
  } catch (err) {
    next(err);
  }
}

export async function recordContribution(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const input = req.body as CreateContributionInput;
    const result = await goalService.recordContribution(
      userId,
      id as string,
      input,
    );

    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function getContributions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const contributions = await goalService.getGoalContributions(
      userId,
      id as string,
    );

    sendSuccess(res, { contributions }, 200);
  } catch (err) {
    next(err);
  }
}
