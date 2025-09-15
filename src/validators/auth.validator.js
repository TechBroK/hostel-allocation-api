import { z } from 'zod';

// Registration validation schema
export const registerSchema = z.object({
  fullName: z.string().min(2, 'fullName must be at least 2 characters').optional(),
  name: z.string().min(2, 'name must be at least 2 characters').optional(),
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
  password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters'),
  matricNumber: z.string().optional(),
  level: z.string().optional(),
  phone: z.string().optional()
}).refine(data => !!(data.fullName || data.name), {
  message: 'Either fullName or name is required',
  path: ['fullName']
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

// Utility to normalize incoming registration payload (choose fullName over name)
export function extractRegistrationData(payload) {
  const { fullName, name, email, password, matricNumber, level, phone } = payload;
  const effectiveName = (fullName || name || '').trim();
  return { fullName: effectiveName, email, password, matricNumber, level, phone };
}
