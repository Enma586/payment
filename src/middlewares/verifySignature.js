import crypto from 'crypto';
import { logger } from '../lib/logger.js';

export const verifySignature = (req, res, next) => {
  const signature = req.headers['x-payment-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!signature) {
    logger.warn('Webhook received without signature header.');
    return res.status(401).json({ error: 'No signature provided' });
  }

  if (!secret) {
    logger.error('WEBHOOK_SECRET is not configured.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const payload = req.rawBody || JSON.stringify(req.body);

  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(payload).digest('hex'), 'utf8');
  const checksum = Buffer.from(signature, 'utf8');

  if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
    logger.error('Invalid signature detected. Webhook rejected.');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  next();
};
