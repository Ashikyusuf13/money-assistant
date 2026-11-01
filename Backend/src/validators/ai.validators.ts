import { z } from 'zod';

export const askAssistantSchema = z.object({
  body: z.object({
    question: z
      .string({ required_error: 'Question is required' })
      .trim()
      .min(2, 'Question must be at least 2 characters')
      .max(500, 'Question cannot exceed 500 characters'),
  }),
});

export type AskAssistantInput = z.infer<typeof askAssistantSchema>['body'];
