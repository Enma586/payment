/**
 * @fileoverview Webhook Controller.
 * Handles incoming webhooks from payment providers.
 * Supports both legacy generic webhooks and dynamic provider webhooks.
 */

import { Transaction } from "../models/index.js";
import providerRegistry from "../providers/registry.js";
import { queueService } from "../services/index.js";
import { logger } from "../lib/logger.js";

/**
 * POST /api/v1/webhooks/:provider
 * Dynamic webhook handler. Routes to the correct provider
 * for signature verification and event parsing.
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

    // 3. Find the existing transaction by providerPaymentId
    // 3. Find the existing transaction
    let transaction = await Transaction.findOne({
      where: { providerPaymentId: parsed.providerPaymentId },
    });

    // Fallback: buscar por el transactionId que enviamos en custom_id
    if (!transaction && parsed.internalTransactionId) {
      transaction = await Transaction.findByPk(parsed.internalTransactionId);
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
