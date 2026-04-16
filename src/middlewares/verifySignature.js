/**
 * @fileoverview Middleware to verify the authenticity of the webhook source.
 * Ensures the request was actually sent by the payment provider (e.g., Stripe).
 */

import crypto from 'crypto';
import { logger } from '../lib/logger.js';

/**
 * Verifies the HMAC signature of the incoming request.
 */
export const verifySignature = (req, res, next) => {
  const signature = req.headers['x-payment-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!signature) {
    logger.warn('Webhook received without signature header.');
    return res.status(401).json({ error: 'No signature provided' });
  }

  // Generate hash from the raw body using our secret
  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(
    hmac.update(JSON.stringify(req.body)).digest('hex'),
    'utf8'
  );

  const checksum = Buffer.from(signature, 'utf8');

  // Use timingSafeEqual to prevent timing attacks
  if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
    logger.error('Invalid signature detected. Webhook rejected.');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  next();
};