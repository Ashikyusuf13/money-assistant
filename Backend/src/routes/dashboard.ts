import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { dashboardQuerySchema } from '../validators/dashboard.validators';

const router = Router();

router.use(authenticate);

router.get('/', validate(dashboardQuerySchema), dashboardController.getDashboard);

export default router;
