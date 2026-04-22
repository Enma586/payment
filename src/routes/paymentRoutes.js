/**
 * @fileoverview Payment Routes.
 * Handles payment creation, status queries, and legacy webhooks.
 */

import { Router } from 'express';
import { paymentController, webhookController } from '../controllers/index.js';
import { verifyApiKey, verifySignature, validateSchema } from '../middlewares/index.js';
import createPaymentSchema from '../schemas/createPaymentSchema.js';
import paymentSchema from '../schemas/paymentSchema.js';

const router = Router();

/**
 * POST /api/v1/payments/create
 * Creates a payment intent with the specified provider.
 * Auth: Service API Key required.
 */
router.post(
  '/create',
  verifyApiKey,
  validateSchema(createPaymentSchema),
  paymentController.createPayment
);

/**
 * GET /api/v1/payments/:id/status
 * Returns the current status of a transaction.
 * Auth: Service API Key required.
 */
router.get(
  '/:id/status',
  verifyApiKey,
  paymentController.getPaymentStatus
);

/**
 * POST /api/v1/payments/webhook
 * Legacy webhook handler (backward compatible).
 * Auth: HMAC signature verification.
 */
router.post(
  '/webhook',
  verifySignature,
  validateSchema(paymentSchema),
  webhookController.handleWebhook
);

export default router;