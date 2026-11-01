import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  transactionIdParamSchema,
  updateTransactionSchema,
} from '../validators/transaction.validators';

const router = Router();

// All transaction endpoints require authentication
router.use(authenticate);

router.post(
  '/',
  validate(createTransactionSchema),
  transactionController.createTransaction,
);

router.get(
  '/',
  validate(listTransactionsQuerySchema),
  transactionController.listTransactions,
);

router.get(
  '/:id',
  validate(transactionIdParamSchema),
  transactionController.getTransaction,
);

router.put(
  '/:id',
  validate(updateTransactionSchema),
  transactionController.updateTransaction,
);

router.delete(
  '/:id',
  validate(transactionIdParamSchema),
  transactionController.deleteTransaction,
);

export default router;
