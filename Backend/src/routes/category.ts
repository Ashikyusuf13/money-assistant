import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Endpoints require authentication
router.use(authenticate);

router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCustomCategory);

export default router;

