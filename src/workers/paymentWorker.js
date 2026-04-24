/**
 * @fileoverview Background Worker to process payment notifications.
 *
 * Listens to the 'payment-notifications' BullMQ queue and sends
 * HTTP POST notifications to the client's webhookUrl when a payment
 * status changes (e.g. COMPLETED, FAILED).
 *
 * Flow:
 *   1. Fetch the transaction from PostgreSQL.
 *   2. Build and validate the notification payload.
 *   3. Generate an HMAC-SHA256 signature of the payload using WEBHOOK_SECRET.
 *   4. Send POST to the client's webhookUrl with the payload and signature header.
 *   5. If the client responds with 2xx, the job is marked as completed.
 *   6. If the request fails, BullMQ retries with exponential backoff.
 *   7. After max retries, the transaction is marked as FAILED.
 *
 * Security:
 *   - The payload is signed with HMAC-SHA256 using the shared WEBHOOK_SECRET.
 *   - The signature is sent in the `X-Signature` header so the client
 *     can verify the notification is authentic and has not been tampered with.
 *   - A timeout of 10 seconds prevents hanging connections.
 */

import crypto from 'crypto';
import axios from 'axios';
import { Worker } from 'bullmq';
import { redisConnection } from '../config/index.js';
import { Transaction } from '../models/index.js';
import notificationSchema from '../schemas/notificationSchema.js';
import { logger } from '../lib/logger.js';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const NOTIFICATION_TIMEOUT = 10_000; // 10 seconds

/**
 * Generates an HMAC-SHA256 signature of the payload using the shared secret.
 *
 * @param {Object} payload - The notification payload to sign.
 * @param {string} secret  - The shared secret key (WEBHOOK_SECRET).
 * @returns {string} Hex-encoded HMAC signature.
 */
const generateSignature = (payload, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
};

const paymentWorker = new Worker('payment-notifications', async (job) => {
  const { transactionId } = job.data;

  logger.info(`Worker processing job ${job.id} for Transaction: ${transactionId}`);

  // 1. Fetch the latest transaction data from PostgreSQL
  const transaction = await Transaction.findByPk(transactionId);

  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found in database.`);
  }

  // 2. Build the notification payload
  const notificationPayload = {
    transactionId: transaction.id,
    externalId: transaction.externalId,
    status: transaction.status,
    amount: transaction.amount,
    currency: transaction.currency,
    timestamp: new Date().toISOString(),
  };

  // Validate payload shape before sending
  const validated = notificationSchema.safeParse(notificationPayload);
  if (!validated.success) {
    logger.error(
      { errors: validated.error.issues },
      'Notification payload validation failed'
    );
    throw new Error(
      `Invalid notification payload: ${validated.error.issues.map(i => i.message).join(', ')}`
    );
  }

  // 3. Determine the client's webhook URL
  const webhookUrl = transaction.webhookUrl || transaction.metadata?.webhookUrl;

  if (!webhookUrl) {
    logger.warn(
      `No webhookUrl configured for transaction ${transactionId}. Skipping notification.`
    );
    return;
  }

  // 4. Generate HMAC signature for payload authenticity
  const signature = generateSignature(notificationPayload, WEBHOOK_SECRET);

  // 5. Send POST notification to the client's webhook URL
  logger.info(`Sending notification to ${webhookUrl} for transaction ${transactionId}`);

  await axios.post(webhookUrl, notificationPayload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
    },
    timeout: NOTIFICATION_TIMEOUT,
  });

  logger.info(
    `Transaction ${transactionId} notification sent successfully to ${webhookUrl}`
  );

}, {
  connection: redisConnection,
  concurrency: 5,
});

// ── Worker Event Listeners ──────────────────────────────────────────────

paymentWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} has been completed!`);
});

paymentWorker.on('failed', async (job, err) => {
  logger.error(`Job ${job.id} has failed with ${err.message}`);

  // After all retries are exhausted, mark the transaction as FAILED
  if (job && job.attemptsMade >= (job.opts?.attempts || 5)) {
    const tx = await Transaction.findByPk(job.data.transactionId);
    if (tx) {
      await tx.update({ status: 'FAILED', errorLog: err.message });
      logger.info(`Transaction ${tx.id} marked as FAILED after all retries exhausted.`);
    }
  }
});

export default paymentWorker;