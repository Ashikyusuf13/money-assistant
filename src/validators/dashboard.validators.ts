import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  query: z.object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format')
      .optional(),
    timezone: z.string().trim().default('Asia/Kolkata').optional(),
  }),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>['query'];
