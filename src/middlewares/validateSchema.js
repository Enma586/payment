/**
 * @fileoverview Generic middleware to validate request bodies against a schema.
 */

/**
 * Returns a middleware function that validates the req.body.
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 */
const validateSchema = (schema) => (req, res, next) => {
  try {
    // Validate and update req.body with parsed/transformed data
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    // If validation fails, pass it to the global error handler
    return res.status(400).json({
      status: 'fail',
      errors: error.errors.map(e => ({ path: e.path, message: e.message }))
    });
  }
};

export default validateSchema;