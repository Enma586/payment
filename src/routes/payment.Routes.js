/**
 * @fileoverview Payment Gateway Routes.
 */

import { Router } from 'express';
import { webhookController } from '../controllers/index.js';
import { verifySignature, validateSchema } from '../middlewares/index.js';
import { paymentSchema } from '../schemas/index.js';

const router = Router();

/**
 * POST /api/v1/payments/webhook
 * Sequence: 
 * 1. Security (Signature)
 * 2. Integrity (Zod Schema)
 * 3. Business Logic (Controller)
 */
router.post(
  '/webhook',
  verifySignature,
  validateSchema(paymentSchema),
  webhookController.handleWebhook
);

export default router;