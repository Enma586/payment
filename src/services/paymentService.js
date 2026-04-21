/**
 * @fileoverview Payment Service to handle core business logic for transactions.
 */

import { Transaction } from '../models/index.js';
import { queueService } from './index.js';
import { logger } from '../lib/logger.js';

/**
 * Processes an incoming payment webhook.
 * Checks for idempotency, saves to DB, and enqueues background processing.
 * * @param {Object} paymentData - Validated payment data from the schema.
 * @returns {Promise<Object>} The created or existing transaction.
 */
export const processWebhook = async (paymentData) => {
  const { externalId, amount, currency, idempotencyKey, rawResponse } = paymentData;

  try {
    // 1. Idempotency Check: Don't process the same external ID twice
    const existingTx = await Transaction.findOne({
      where: { externalId, idempotencyKey }
    });
    
    if (existingTx) {
      logger.warn(`Duplicate webhook received for externalId: ${externalId}. Skipping creation.`);
      return existingTx;
    }

    // 2. Persist initial record in PostgreSQL
    const transaction = await Transaction.create({
      externalId,
      amount,
      currency,
      idempotencyKey,
      rawResponse,
      status: 'RECEIVED' // Initial state
    });

    logger.info(`Transaction ${transaction.id} saved to DB. Enqueueing for notification...`);

    // 3. Delegate background task to Queue Service
    // We only send the ID, the worker will fetch the full record later
    await queueService.addPaymentToQueue(transaction.id);

    return transaction;
  } catch (error) {
    logger.error(`Failed to process webhook in paymentService: ${error.message}`);
    throw error; // Let the controller/errorHandler handle the response
  }
};