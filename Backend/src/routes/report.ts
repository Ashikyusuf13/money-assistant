import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  categoryReportQuerySchema,
  insightsQuerySchema,
  periodReportQuerySchema,
} from '../validators/report.validators';

const router = Router();

router.use(authenticate);

router.get('/period', validate(periodReportQuerySchema), reportController.getPeriodReport);
router.get('/categories', validate(categoryReportQuerySchema), reportController.getCategoryReport);
router.get('/salary-growth', reportController.getSalaryGrowthReport);
router.get('/savings-progress', reportController.getSavingsProgressReport);
router.get('/insights', validate(insightsQuerySchema), reportController.getFinancialInsights);

export default router;
