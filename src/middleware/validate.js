import { ValidationError } from '../errors/AppError.js';

/**
 * Generic validation middleware factory.
 * Accepts a Zod schema and validates a merged object of body, params, and query.
 * On success attaches the parsed data to req.validated and calls next().
 * On failure throws ValidationError (handled by global error middleware).
 */
export const validate = (schema) => (req, _res, next) => {
  const input = { ...req.query, ...req.params, ...req.body };
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({
      field: i.path.join('.'),
      message: i.message
    }));
    // Use first message as high-level error message
    const message = issues[0]?.message || 'Validation failed';
    throw new ValidationError(message, issues);
  }
  req.validated = result.data;
  next();
};
