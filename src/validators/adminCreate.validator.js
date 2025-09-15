import { z } from 'zod';

// Admin creation schema: allow either fullName or name; normalize later.
export const createAdminSchema = z.object({
  fullName: z.string().min(2, 'fullName must be at least 2 characters').optional(),
  name: z.string().min(2, 'name must be at least 2 characters').optional(),
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
  password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional()
}).refine((data) => !!(data.fullName || data.name), {
  message: 'Either fullName or name is required',
  path: ['fullName']
});

export default createAdminSchema;
