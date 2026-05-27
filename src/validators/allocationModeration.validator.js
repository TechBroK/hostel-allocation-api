import { z } from 'zod';

export const approveAllocationSchema = z.object({
  body: z.object({
    roomId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional()
  })
});
