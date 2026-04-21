/**
 * @fileoverview Global Error Handler.
 * Catches all errors and returns a standardized JSON response.
 */

import { logger } from '../lib/logger.js';

/**
 * Standardized error handling middleware.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error for the development team
  logger.error({
    stack: err.stack,
    body: req.body
  }, `[${req.method}] ${req.url} - Error: ${message}`);

  // Standardized response for the client
  res.status(statusCode).json({
    status: 'error',
    code: err.code || 'INTERNAL_ERROR',
    message: message,
    // Only reveal stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};