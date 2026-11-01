import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { askAssistantSchema } from '../validators/ai.validators';

const router = Router();

router.use(authenticate);

router.post('/ask', validate(askAssistantSchema), aiController.askAssistant);

export default router;
