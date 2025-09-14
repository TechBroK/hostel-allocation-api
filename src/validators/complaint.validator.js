import { z } from 'zod';

export const createComplaintSchema = z.object({
  type: z.enum(['Maintenance', 'Roommate', 'Facilities', 'Other']),
  description: z.string().min(5)
});

export const studentIdParamSchema = z.object({
  studentId: z.string().min(1)
});
