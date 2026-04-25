/**
 * @fileoverview Webhook Controller.
 * Handles incoming webhooks from payment providers (PayPal, Stripe, etc.)
 * and dispatches notifications to the client's system via the worker queue.
 *
 * Supports two endpoints:
 * - Dynamic:   POST /api/v1/webhooks/:provider — routes to the correct provider.
 * - Legacy:    POST /api/v1/payments/webhook   — backward compatible handler.
 */

import { Transaction } from "../models/index.js";
import providerRegistry from "../providers/registry.js";
import { queueService, paymentService } from "../services/index.js";
import { logger } from "../lib/logger.js";

/**
 * POST /api/v1/webhooks/:provider
 * Dynamic webhook handler.
 *
 * Flow:
 *   1. Verify webhook signature using the provider's verification method.
 *   2. Parse the event into the standard internal format.
 *   3. Find the transaction by providerPaymentId (with custom_id fallback).
 *   4. Update the transaction status and raw response.
 *   5. Enqueue a notification job for the client.
 *
 * @param {import('express').Request}  req  - Express request. `req.params.provider` is the provider name.
 * @param {import('express').Response} res  - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 */
export const handleProviderWebhook = async (req, res, next) => {
  try {
    const { provider: providerName } = req.params;
    logger.info(`Webhook received from provider: ${providerName}`);

    const provider = providerRegistry.getProvider(providerName);

    // 1. Verify webhook using the provider's own verification
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const { valid, event } = await provider.verifyWebhook(rawBody, req.headers);

    if (!valid) {
      logger.warn(`Invalid webhook signature for provider: ${providerName}`);
      return res
        .status(403)
        .json({ status: "error", message: "Invalid signature" });
    }

    // 2. Parse the event into our standard format
    const parsed = provider.parseWebhookEvent(event);
    logger.info({ parsed }, `Parsed webhook event from ${providerName}`);

    // 3. Find the existing transaction
    let transaction = await Transaction.findOne({
      where: { providerPaymentId: parsed.providerPaymentId },
    });

    // Fallback: search by the internal transactionId sent in custom_id
    if (!transaction && parsed.internalTransactionId) {
      transaction = await Transaction.findByPk(parsed.internalTransactionId);
    }

    if (!transaction) {
      logger.warn(
        `No transaction found for providerPaymentId: ${parsed.providerPaymentId}`,
      );
      return res
        .status(200)
        .json({ status: "ignored", message: "Transaction not found" });
    }

    // 4. Update transaction status
    await transaction.update({
      status: parsed.status,
      rawResponse: event,
    });

    // 5. Enqueue notification
    await queueService.addPaymentToQueue(transaction.id);

    logger.info(`Transaction ${transaction.id} updated to ${parsed.status}`);
    return res
      .status(200)
      .json({ status: "success", message: "Webhook processed" });
  } catch (error) {
    logger.error({ error: error.message }, "Provider webhook processing error");
    next(error);
  }
};

/**
 * POST /api/v1/payments/webhook
 * Legacy webhook handler. Kept for backward compatibility.
 *
 * @param {import('express').Request}  req  - Express request.
 * @param {import('express').Response} res  - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const { externalId } = req.body;
    logger.info(`Processing incoming webhook for External ID: ${externalId}`);

    const transaction = await paymentService.processWebhook(req.body);

    return res.status(201).json({
      status: "success",
      message: "Webhook processed successfully",
      data: {
        id: transaction.id,
        status: transaction.status,
      },
    });
  } catch (error) {
    logger.error(`Controller Error: ${error.message}`);
    next(error);
  }
};