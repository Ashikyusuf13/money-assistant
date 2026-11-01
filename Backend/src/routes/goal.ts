import { Router } from 'express';
import * as goalController from '../controllers/goal.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  createContributionSchema,
  createGoalSchema,
  goalIdParamSchema,
  listGoalsQuerySchema,
  updateGoalSchema,
} from '../validators/goal.validators';

const router = Router();

router.use(authenticate);

// List goals
router.get('/', validate(listGoalsQuerySchema), goalController.listGoals);

// Create goal
router.post('/', validate(createGoalSchema), goalController.createGoal);

// Single goal by ID
router.get('/:id', validate(goalIdParamSchema), goalController.getGoal);

// Update goal
router.put('/:id', validate(updateGoalSchema), goalController.updateGoal);

// Delete goal
router.delete('/:id', validate(goalIdParamSchema), goalController.deleteGoal);

// Add contribution or withdrawal to goal
router.post(
  '/:id/contributions',
  validate(createContributionSchema),
  goalController.recordContribution,
);

// List contribution history for goal
router.get(
  '/:id/contributions',
  validate(goalIdParamSchema),
  goalController.getContributions,
);

export default router;
