import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  matricNumber: z.string().optional(),
  phone: z.string().optional(),
  level: z.string().optional()
});

export const studentIdParamSchema = z.object({
  studentId: z.string().min(1)
});
