import { Router } from 'express';
import * as budgetController from '../controllers/budget.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  budgetIdParamSchema,
  createBudgetSchema,
  listBudgetsQuerySchema,
  updateBudgetSchema,
} from '../validators/budget.validators';

const router = Router();

// All budget routes require authentication
router.use(authenticate);

// List budgets
router.get('/', validate(listBudgetsQuerySchema), budgetController.listBudgets);

// Create budget
router.post('/', validate(createBudgetSchema), budgetController.createBudget);

// Alerts route (must precede /:id)
router.get('/alerts', validate(listBudgetsQuerySchema), budgetController.getBudgetAlerts);

// Single budget by ID
router.get('/:id', validate(budgetIdParamSchema), budgetController.getBudget);

// Update budget
router.put('/:id', validate(updateBudgetSchema), budgetController.updateBudget);

// Delete budget
router.delete('/:id', validate(budgetIdParamSchema), budgetController.deleteBudget);

export default router;
