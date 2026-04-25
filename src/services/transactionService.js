/**
 * @fileoverview Transaction Service.
 * Handles core business logic for payment creation, status queries,
 * provider interactions, and idempotency control.
 */

import { Transaction } from "../models/index.js";
import providerRegistry from "../providers/registry.js";
import { queueService } from "./index.js";
import { logger } from "../lib/logger.js";

/**
 * Creates a payment intent with the specified provider.
 *
 * Supports idempotency: if the payload includes an `idempotencyKey`,
 * the service checks for an existing transaction with that key.
 * If found, returns the existing transaction without creating a duplicate.
 * If not found, proceeds with normal creation.
 *
 * Flow:
 *   1. Check idempotency key (if provided) against existing transactions.
 *   2. Persist initial record in PostgreSQL with status RECEIVED.
 *   3. Call the provider to create the payment (e.g. PayPal order, Stripe session).
 *   4. Update the transaction with provider details and status PROCESSING.
 *
 * @param {Object} paymentData - Validated payment data from createPaymentSchema.
 * @param {number} paymentData.amount - Amount in cents.
 * @param {string} paymentData.currency - 3-letter currency code.
 * @param {string} paymentData.provider - Provider name (e.g. "paypal").
 * @param {string} [paymentData.paymentMethod] - Payment method to use.
 * @param {string} [paymentData.returnUrl] - URL for successful payment redirect.
 * @param {string} [paymentData.cancelUrl] - URL for cancelled payment redirect.
 * @param {string} [paymentData.idempotencyKey] - Client key to prevent duplicates.
 * @param {string} [paymentData.webhookUrl] - Client URL to receive status notifications.
 * @param {Object} [paymentData.metadata] - Arbitrary client metadata.
 * @returns {Promise<Object>} The created or existing transaction with provider details.
 */
export const createPayment = async (paymentData) => {
  const {
    amount, currency, provider, paymentMethod,
    returnUrl, cancelUrl, metadata, idempotencyKey,
  } = paymentData;

  // Idempotency: if client sends a key, check if a transaction already exists.
  if (idempotencyKey) {
    const existing = await Transaction.findOne({
      where: { idempotencyKey },
    });

    if (existing) {
      logger.info(
        `Idempotent request detected for key: ${idempotencyKey}, ` +
        `returning existing transaction ${existing.id}`
      );
      return {
        transactionId: existing.id,
        providerPaymentId: existing.providerPaymentId,
        redirectUrl: existing.rawResponse?.redirectUrl || null,
        status: existing.status,
      };
    }
  }

  const providerInstance = providerRegistry.getProvider(provider);

  // Persist initial record in PostgreSQL
  const transaction = await Transaction.create({
    externalId: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    amount,
    currency,
    provider,
    paymentMethod: paymentMethod || providerInstance.getSupportedMethods()[0],
    idempotencyKey: idempotencyKey || `ik_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    webhookUrl: metadata?.webhookUrl || null,
    status: "RECEIVED",
    metadata: { returnUrl, cancelUrl, ...metadata },
  });

  // Call the provider to create the payment
  const result = await providerInstance.createPayment({
    amount,
    currency,
    returnUrl: returnUrl || `${process.env.BASE_URL}/api/v1/payments/callback`,
    cancelUrl: cancelUrl || `${process.env.BASE_URL}/api/v1/payments/callback?cancelled=true`,
    metadata: { transactionId: transaction.id },
  });

  // Update transaction with provider details
  await transaction.update({
    providerPaymentId: result.providerPaymentId,
    rawResponse: result,
    status: "PROCESSING",
  });

  logger.info(`Payment created: ${transaction.id} via ${provider}`);

  return {
    transactionId: transaction.id,
    providerPaymentId: result.providerPaymentId,
    redirectUrl: result.redirectUrl,
    status: transaction.status,
  };
};

/**
 * Captures an approved payment using the provider's capture API.
 *
 * Called by the callback endpoint when PayPal redirects the user back
 * after approving a payment. If the transaction is already COMPLETED,
 * returns early without calling the provider again.
 *
 * @param {string} orderId - The provider's order/session ID (e.g. PayPal Order ID).
 * @returns {Promise<{transaction: Object, alreadyCaptured: boolean}>}
 * @throws {Error} If no transaction is found for the given orderId.
 */
export const captureByOrderId = async (orderId) => {
  const transaction = await Transaction.findOne({
    where: { providerPaymentId: orderId },
  });

  if (!transaction) {
    throw new Error(`No transaction found for orderId: ${orderId}`);
  }

  // Prevent double-capture if callback fires more than once
  if (transaction.status === "COMPLETED") {
    return { transaction, alreadyCaptured: true };
  }

  const providerInstance = providerRegistry.getProvider(transaction.provider);
  const result = await providerInstance.capturePayment(orderId);

  await transaction.update({
    status: "COMPLETED",
    rawResponse: result.rawResponse,
  });

  await queueService.addPaymentToQueue(transaction.id);
  logger.info(`Transaction ${transaction.id} captured and updated to COMPLETED`);

  return { transaction, alreadyCaptured: false };
};

/**
 * Marks a transaction as FAILED when the user cancels the payment.
 *
 * No-op if the transaction was already COMPLETED (edge case where
 * the user somehow reaches the cancel URL after paying).
 *
 * @param {string} orderId - The provider's order/session ID.
 */
export const cancelByOrderId = async (orderId) => {
  const transaction = await Transaction.findOne({
    where: { providerPaymentId: orderId },
  });

  if (!transaction) return;

  if (transaction.status !== "COMPLETED") {
    await transaction.update({ status: "FAILED" });
    logger.info(`Transaction ${transaction.id} cancelled`);
  }
};

/**
 * Gets the current status and details of a transaction.
 *
 * @param {string} transactionId - Internal UUID of the transaction.
 * @returns {Promise<Object|null>} The transaction data or null if not found.
 */
export const getPaymentStatus = async (transactionId) => {
  const transaction = await Transaction.findByPk(transactionId);

  if (!transaction) {
    return null;
  }

  return {
    id: transaction.id,
    externalId: transaction.externalId,
    provider: transaction.provider,
    providerPaymentId: transaction.providerPaymentId,
    paymentMethod: transaction.paymentMethod,
    amount: transaction.amount,
    currency: transaction.currency,
    status: transaction.status,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
};

/**
 * Lists all available providers and their supported payment methods.
 *
 * @returns {Array<{name: string, methods: string[]}>}
 */
export const getAvailableMethods = () => {
  return providerRegistry.listAll();
};
/**
 * Refunds a completed transaction through the payment provider.
 *
 * Supports full refunds (no amount specified) and partial refunds.
 * For PayPal, resolves the Order ID to the Capture ID automatically.
 *
 * @param {string} transactionId - Internal UUID of the transaction.
 * @param {Object} [refundData={}]
 * @param {number} [refundData.amount] - Amount in cents for partial refund.
 * @param {string} [refundData.reason] - Reason for the refund.
 * @returns {Promise<Object>} Refund result with transactionId, refundId, status, amount.
 * @throws {Error} If transaction not found, not COMPLETED, or refund fails.
 */
export const refundPayment = async (transactionId, refundData = {}) => {
  const transaction = await Transaction.findByPk(transactionId);

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  if (transaction.status !== 'COMPLETED') {
    throw new Error(`Cannot refund: transaction status is ${transaction.status}, expected COMPLETED`);
  }

  const providerInstance = providerRegistry.getProvider(transaction.provider);
  const refundAmount = refundData.amount || transaction.amount;

  let providerPaymentId = transaction.providerPaymentId;

  if (transaction.provider === 'paypal') {
    const captureId =
      transaction.rawResponse?.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    if (!captureId) {
      throw new Error('Cannot refund: no PayPal Capture ID found in transaction data');
    }
    providerPaymentId = captureId;
  }

  const result = await providerInstance.refundPayment(providerPaymentId, refundAmount);

  await transaction.update({
    status: 'REFUNDED',
    rawResponse: { original: transaction.rawResponse, refund: result },
    errorLog: refundData.reason || null,
  });

  logger.info(`Transaction ${transaction.id} refunded (${refundAmount} cents)`);

  return {
    transactionId: transaction.id,
    refundId: result.refundId,
    status: result.status,
    amount: refundAmount,
  };
};