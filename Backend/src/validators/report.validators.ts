import { z } from 'zod';

export const periodReportQuerySchema = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly', 'custom']).default('monthly').optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    month: z.string().optional(),
    category: z.string().optional(),
    timezone: z.string().trim().default('Asia/Kolkata').optional(),
  }),
});

export const categoryReportQuerySchema = z.object({
  query: z.object({
    month: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    category: z.string().optional(),
    limit: z.coerce.number().int().positive().max(50).default(10).optional(),
  }),
});

export const insightsQuerySchema = z.object({
  query: z.object({
    month: z.string().optional(),
  }),
});

export type PeriodReportQuery = z.infer<typeof periodReportQuerySchema>['query'];
export type CategoryReportQuery = z.infer<typeof categoryReportQuerySchema>['query'];
export type InsightsQuery = z.infer<typeof insightsQuerySchema>['query'];
