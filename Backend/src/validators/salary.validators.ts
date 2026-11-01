import { z } from 'zod';
import { DEFAULT_CURRENCY } from '../constants/accounting';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const setupSalarySchema = z.object({
  body: z.object({
    baseMonthlySalary: z
      .number({ required_error: 'Base monthly salary is required' })
      .int('Salary must be an integer in paise')
      .positive('Salary must be greater than zero'),
    effectiveDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    currency: z.string().trim().default(DEFAULT_CURRENCY).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const addSalaryRevisionSchema = z.object({
  body: z.object({
    revisedSalary: z
      .number({ required_error: 'Revised salary is required' })
      .int('Revised salary must be an integer in paise')
      .positive('Revised salary must be greater than zero'),
    effectiveDate: z
      .string({ required_error: 'Effective date is required' })
      .datetime({ offset: true })
      .or(z.string().date()),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const recordSalaryCreditSchema = z.object({
  body: z.object({
    accountId: z
      .string({ required_error: 'Destination accountId is required' })
      .regex(objectIdRegex, 'Invalid account ID format'),
    amount: z
      .number()
      .int('Amount must be an integer in paise')
      .positive('Amount must be greater than zero')
      .optional(), // If omitted, defaults to current baseMonthlySalary
    date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    description: z.string().trim().max(255).default('Monthly Salary Credit').optional(),
    notes: z.string().trim().max(500).optional(),
    idempotencyKey: z.string().trim().max(128).optional(),
  }),
});

export type SetupSalaryInput = z.infer<typeof setupSalarySchema>['body'];
export type AddSalaryRevisionInput = z.infer<typeof addSalaryRevisionSchema>['body'];
export type RecordSalaryCreditInput = z.infer<typeof recordSalaryCreditSchema>['body'];
