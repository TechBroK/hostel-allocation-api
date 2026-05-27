import { z } from 'zod';

export const createComplaintSchema = z.object({
  type: z.enum(['Maintenance', 'Roommate', 'Facilities', 'Other']),
  description: z.string().min(5)
});

export const studentIdParamSchema = z.object({
  studentId: z.string().min(1)
});

export const complaintIdParamSchema = z.object({
  complaintId: z.string().min(1)
});

export const updateComplaintSchema = z.object({
  status: z.enum(['Pending','Resolved']).optional(),
  response: z.string().min(1).optional(),
}).refine((data) => typeof data.status !== 'undefined' || typeof data.response !== 'undefined', {
  message: 'At least one of status or response is required',
});
