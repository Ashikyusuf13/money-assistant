import { z } from 'zod';
import {
  GOAL_CONTRIBUTION_TYPES,
  GOAL_PRIORITIES,
  GOAL_STATUSES,
} from '../constants/accounting';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const goalIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid goal ID format'),
  }),
});

export const createGoalSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Goal name is required' })
      .trim()
      .min(1, 'Goal name cannot be empty')
      .max(100, 'Goal name cannot exceed 100 characters'),
    targetAmount: z
      .number({ required_error: 'Target amount is required' })
      .int('Target amount must be an integer in paise')
      .positive('Target amount must be greater than zero'),
    targetDate: z
      .string({ required_error: 'Target date is required' })
      .datetime({ offset: true })
      .or(z.string().date()),
    priority: z.enum(GOAL_PRIORITIES).default('medium').optional(),
    category: z.string().trim().max(50).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const updateGoalSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid goal ID format'),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    targetAmount: z
      .number()
      .int('Target amount must be an integer in paise')
      .positive('Target amount must be greater than zero')
      .optional(),
    targetDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().date())
      .optional(),
    priority: z.enum(GOAL_PRIORITIES).optional(),
    category: z.string().trim().max(50).optional(),
    status: z.enum(GOAL_STATUSES).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const createContributionSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid goal ID format'),
  }),
  body: z.object({
    type: z.enum(GOAL_CONTRIBUTION_TYPES).default('contribution').optional(),
    amount: z
      .number({ required_error: 'Contribution amount is required' })
      .int('Amount must be an integer in paise')
      .positive('Amount must be greater than zero'),
    date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    fromAccountId: z
      .string()
      .regex(objectIdRegex, 'Invalid account ID format')
      .optional(),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const listGoalsQuerySchema = z.object({
  query: z.object({
    status: z.enum(GOAL_STATUSES).optional(),
    priority: z.enum(GOAL_PRIORITIES).optional(),
  }),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>['body'];
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>['body'];
export type CreateContributionInput = z.infer<typeof createContributionSchema>['body'];
export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>['query'];
