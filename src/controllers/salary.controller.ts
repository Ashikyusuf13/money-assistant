import { Request, Response, NextFunction } from 'express';
import * as salaryService from '../services/salary.service';
import { sendSuccess } from '../utils/response';
import {
  AddSalaryRevisionInput,
  RecordSalaryCreditInput,
  SetupSalaryInput,
} from '../validators/salary.validators';

export async function getSalary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const salary = await salaryService.getSalaryProfile(userId);
    sendSuccess(res, { salary }, 200);
  } catch (err) {
    next(err);
  }
}

export async function setupSalary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = req.body as SetupSalaryInput;
    const salary = await salaryService.setupSalary(userId, input);
    sendSuccess(res, { salary }, 200);
  } catch (err) {
    next(err);
  }
}

export async function addSalaryRevision(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = req.body as AddSalaryRevisionInput;
    const salary = await salaryService.addSalaryRevision(userId, input);
    sendSuccess(res, { salary }, 200);
  } catch (err) {
    next(err);
  }
}

export async function getSalaryComparison(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const comparison = await salaryService.getSalaryComparison(userId);
    sendSuccess(res, { comparison }, 200);
  } catch (err) {
    next(err);
  }
}

export async function recordSalaryCredit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = req.body as RecordSalaryCreditInput;
    const { transaction, isDuplicate } = await salaryService.recordSalaryCredit(
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

export async function getSalaryCreditsHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const credits = await salaryService.getSalaryCreditsHistory(userId);
    sendSuccess(res, { credits }, 200);
  } catch (err) {
    next(err);
  }
}
