import { z } from 'zod';
import { TRANSACTION_TYPES } from '../constants/accounting';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const transactionIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid transaction ID format'),
  }),
});

export const createTransactionSchema = z.object({
  body: z
    .object({
      type: z.enum(TRANSACTION_TYPES, {
        errorMap: () => ({ message: 'Invalid transaction type' }),
      }),
      amount: z
        .number({ required_error: 'Amount is required' })
        .int('Amount must be an integer in paise')
        .positive('Amount must be greater than zero'),
      date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
      category: z
        .string({ required_error: 'Category is required' })
        .trim()
        .min(1, 'Category cannot be empty')
        .max(100, 'Category cannot exceed 100 characters'),
      description: z
        .string({ required_error: 'Description is required' })
        .trim()
        .min(1, 'Description cannot be empty')
        .max(255, 'Description cannot exceed 255 characters'),
      accountId: z
        .string()
        .regex(objectIdRegex, 'Invalid account ID format')
        .optional(),
      toAccountId: z
        .string()
        .regex(objectIdRegex, 'Invalid destination account ID format')
        .optional(),
      originalTransactionId: z
        .string()
        .regex(objectIdRegex, 'Invalid original transaction ID format')
        .optional(),
      tags: z.array(z.string().trim().max(50)).max(10).optional(),
      notes: z.string().trim().max(500).optional(),
      idempotencyKey: z.string().trim().max(128).optional(),
    })
    .refine(
      (data) => {
        if (data.type === 'transfer') {
          return Boolean(data.toAccountId && data.toAccountId !== data.accountId);
        }
        return true;
      },
      {
        message: 'Transfer requires a distinct destination toAccountId',
        path: ['toAccountId'],
      },
    ),
});

export const updateTransactionSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid transaction ID format'),
  }),
  body: z
    .object({
      amount: z
        .number()
        .int('Amount must be an integer in paise')
        .positive('Amount must be greater than zero')
        .optional(),
      date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
      category: z.string().trim().min(1).max(100).optional(),
      description: z.string().trim().min(1).max(255).optional(),
      accountId: z
        .string()
        .regex(objectIdRegex, 'Invalid account ID format')
        .optional(),
      toAccountId: z
        .string()
        .regex(objectIdRegex, 'Invalid destination account ID format')
        .optional(),
      tags: z.array(z.string().trim().max(50)).max(10).optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .refine(
      (data) => {
        if (data.accountId && data.toAccountId) {
          return data.accountId !== data.toAccountId;
        }
        return true;
      },
      {
        message: 'Destination toAccountId cannot match source accountId',
        path: ['toAccountId'],
      },
    ),
});

export const listTransactionsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    type: z.enum(TRANSACTION_TYPES).optional(),
    category: z.string().trim().optional(),
    accountId: z.string().regex(objectIdRegex).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    minAmount: z.coerce.number().int().positive().optional(),
    maxAmount: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
    sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>['body'];
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>['query'];
