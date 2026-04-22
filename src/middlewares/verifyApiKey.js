/**
 * @fileoverview Middleware to authenticate requests between microservices.
 * Validates the x-api-key header against the configured SERVICE_API_KEY.
 */

import { logger } from '../lib/logger.js';

export const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const serviceKey = process.env.SERVICE_API_KEY;

  if (!serviceKey) {
    logger.error('SERVICE_API_KEY is not configured.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!apiKey) {
    logger.warn('Request received without API key.');
    return res.status(401).json({ error: 'API key is required' });
  }

  if (apiKey !== serviceKey) {
    logger.warn('Invalid API key provided.');
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};