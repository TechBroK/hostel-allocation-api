import { z } from 'zod';
import { LASU_DEPARTMENTS, LEVELS } from '../models/User.js';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  matricNumber: z.string().optional(),
  phone: z.string().optional(),
  level: z.enum(LEVELS).optional(),
  gender: z.enum(['male','female']).optional(),
  department: z.enum(LASU_DEPARTMENTS).optional(),
});

export const studentIdParamSchema = z.object({
  studentId: z.string().min(1)
});
