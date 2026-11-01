import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const budgetIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid budget ID format'),
  }),
});

export const createBudgetSchema = z.object({
  body: z.object({
    category: z
      .string({ required_error: 'Category is required' })
      .trim()
      .min(1, 'Category cannot be empty')
      .max(100, 'Category cannot exceed 100 characters'),
    amount: z
      .number({ required_error: 'Budget amount is required' })
      .int('Amount must be an integer in paise')
      .positive('Budget amount must be greater than zero'),
    month: z
      .string({ required_error: 'Month is required' })
      .regex(monthRegex, 'Month must be in YYYY-MM format'),
    alertThreshold: z
      .number()
      .int('Alert threshold must be an integer')
      .min(1, 'Alert threshold must be at least 1%')
      .max(100, 'Alert threshold cannot exceed 100%')
      .default(80)
      .optional(),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const updateBudgetSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid budget ID format'),
  }),
  body: z.object({
    amount: z
      .number()
      .int('Amount must be an integer in paise')
      .positive('Budget amount must be greater than zero')
      .optional(),
    alertThreshold: z
      .number()
      .int('Alert threshold must be an integer')
      .min(1)
      .max(100)
      .optional(),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const listBudgetsQuerySchema = z.object({
  query: z.object({
    month: z.string().regex(monthRegex).optional(),
    category: z.string().trim().optional(),
  }),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>['body'];
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>['body'];
export type ListBudgetsQuery = z.infer<typeof listBudgetsQuerySchema>['query'];
