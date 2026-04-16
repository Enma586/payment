/**
 * @fileoverview Generic validation middleware using Zod schemas.
 */

/**
 * Middleware factory that validates the request body against a Zod schema.
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate.
 * @returns {Function} Express middleware function.
 */
export const validateSchema = (schema) => (req, res, next) => {
  try {
    // We parse the body. Zod will strip unknown fields and cast types.
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    // If validation fails, we send a structured 400 Bad Request response.
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_FAILED',
      details: error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }))
    });
  }
};