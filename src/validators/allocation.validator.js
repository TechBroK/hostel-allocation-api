import { z } from 'zod';

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
