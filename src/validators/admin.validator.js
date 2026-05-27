import { z } from 'zod';

export const updateStudentStatusSchema = z.object({
  status: z.enum(['allocated', 'pending', 'rejected'])
});

export const createStudentSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  matricNumber: z.string().optional(),
  level: z.enum(['100','200','300','400','500']).optional(),
  phone: z.string().optional(),
  gender: z.enum(['male','female']).optional(),
  department: z.string().optional()
});

export const updateStudentProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  matricNumber: z.string().optional(),
  level: z.enum(['100','200','300','400','500']).optional(),
  phone: z.string().optional(),
  gender: z.enum(['male','female']).optional(),
  department: z.string().optional()
});
