import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';
import { DashboardQuery } from '../validators/dashboard.validators';

export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = req.query as unknown as DashboardQuery;
    const data = await dashboardService.getDashboardSummary(userId, query.month);

    sendSuccess(res, data, 200);
  } catch (err) {
    next(err);
  }
}
