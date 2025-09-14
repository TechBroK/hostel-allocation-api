import { z } from 'zod';

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1),
  type: z.enum(['Standard', 'Premium']),
  capacity: z.number().int().positive()
});

export const roomIdParamSchema = z.object({
  id: z.string().min(1)
});

export const hostelIdParamSchema = z.object({
  hostelId: z.string().min(1)
});
