import { Router } from 'express';
import * as salaryController from '../controllers/salary.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  addSalaryRevisionSchema,
  recordSalaryCreditSchema,
  setupSalarySchema,
} from '../validators/salary.validators';

const router = Router();

// All salary routes require authentication
router.use(authenticate);

router.get('/', salaryController.getSalary);
router.post('/', validate(setupSalarySchema), salaryController.setupSalary);
router.post('/revisions', validate(addSalaryRevisionSchema), salaryController.addSalaryRevision);
router.get('/comparison', salaryController.getSalaryComparison);
router.post('/credits', validate(recordSalaryCreditSchema), salaryController.recordSalaryCredit);
router.get('/credits', salaryController.getSalaryCreditsHistory);

export default router;
