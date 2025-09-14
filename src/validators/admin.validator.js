import { z } from 'zod';

export const updateStudentStatusSchema = z.object({
  status: z.enum(['allocated', 'pending', 'rejected'])
});
