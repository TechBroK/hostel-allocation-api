import { z } from 'zod';

// sort param supports comma separated segments field:dir
const sortParam = z.string().regex(/^[a-zA-Z0-9:,._-]+$/).optional().refine(val => {
  if (!val) { return true; }
  return val.split(',').every(seg => {
    const [f, d] = seg.split(':');
    return ['asc', 'desc', undefined].includes(d) && ['fullName', 'email', 'createdAt'].includes(f);
  });
}, { message: 'Invalid sort format' });

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().min(1).max(100).optional(),
  gender: z.enum(['male','female']).optional(),
  allocationStatus: z.enum(['approved','pending','none']).optional(),
  sort: sortParam.optional()
});

export default listStudentsQuerySchema;