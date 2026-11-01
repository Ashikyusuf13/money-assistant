import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/report.service';
import { sendSuccess } from '../utils/response';
import {
  CategoryReportQuery,
  InsightsQuery,
  PeriodReportQuery,
} from '../validators/report.validators';

export async function getPeriodReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = req.query as unknown as PeriodReportQuery;
    const data = await reportService.getPeriodReport(userId, query);

    sendSuccess(res, data, 200);
  } catch (err) {
    next(err);
  }
}

export async function getCategoryReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = req.query as unknown as CategoryReportQuery;
    const data = await reportService.getCategoryReport(userId, query);

    sendSuccess(res, data, 200);
  } catch (err) {
    next(err);
  }
}

export async function getSalaryGrowthReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const data = await reportService.getSalaryGrowthReport(userId);

    sendSuccess(res, data, 200);
  } catch (err) {
    next(err);
  }
}

export async function getSavingsProgressReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const data = await reportService.getSavingsProgressReport(userId);

    sendSuccess(res, data, 200);
  } catch (err) {
    next(err);
  }
}

export async function getFinancialInsights(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = req.query as unknown as InsightsQuery;
    const data = await reportService.getFinancialInsights(userId, query);

    sendSuccess(res, data, 200);
  } catch (err) {
    next(err);
  }
}
