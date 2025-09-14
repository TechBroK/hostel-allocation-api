import { z } from 'zod';

// Registration validation schema
export const registerSchema = z.object({
  fullName: z.string({ required_error: 'Full name is required' }).min(2, 'Full name must be at least 2 characters'),
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
  password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters'),
  matricNumber: z.string().optional(),
  level: z.string().optional(),
  phone: z.string().optional()
});

// Login validation schema
export const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
  password: z.string({ required_error: 'Password is required' })
});

// Helper map (if we later need dynamic selection by name)
export const authSchemas = {
  register: registerSchema,
  login: loginSchema
};
