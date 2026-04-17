/**
 * @fileoverview Robust validation middleware using Zod safeParse.
 */

/**
 * Middleware factory that validates the request body against a Zod schema.
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate.
 * @returns {Function} Express middleware function.
 */
export const validateSchema = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_FAILED',
      details: result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  req.body = result.data;
  next();
};