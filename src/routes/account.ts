import { Router } from 'express';
import { authenticate } from '../middleware';
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../controllers/account.controller';

const router = Router();

router.use(authenticate);

router.get('/', listAccounts);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;
