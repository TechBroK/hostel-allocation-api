import { z } from 'zod';

export const createHostelSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['male', 'female']),
  capacity: z.number().int().positive(),
  description: z.string().optional()
});

export const hostelIdParamSchema = z.object({
  hostelId: z.string().min(1)
});
