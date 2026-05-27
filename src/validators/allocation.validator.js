import { z } from 'zod';
import { LASU_DEPARTMENTS, LEVELS } from '../models/User.js';
import { personalityTraitsSchema } from './personality.validator.js';

export const submitAllocationSchema = z.object({
  roomPreference: z.object({ roomId: z.string().min(1) }).optional(),
  personalityTraits: z.array(z.string()).optional(),
  studentDetails: z.record(z.any()).optional(),
  session: z.string().min(4).optional()
});

export const adminCreateAllocationSchema = z.object({
  studentId: z.string().min(1),
  roomId: z.string().min(1),
  session: z.string().min(4).optional()
});

export const studentIdParamSchema = z.object({
  studentId: z.string().min(1)
});

export const applyAllocationSchema = z.object({
  profile: z.object({
    fullName: z.string().min(2).optional(),
    matricNumber: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    level: z.enum(LEVELS).optional(),
    gender: z.enum(['male','female']).optional(),
    department: z.enum(LASU_DEPARTMENTS).optional(),
    emergencyContact: z.string().optional(),
    healthConditions: z.string().optional(),
    specialRequests: z.string().optional(),
  }).optional(),
  personalityTraits: personalityTraitsSchema.optional(),
  roomId: z.string().min(1).optional(),
  session: z.string().min(4).optional(),
});
