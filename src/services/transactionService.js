/**
 * @fileoverview Transaction Service.
 * Handles core business logic for payment creation, status queries,
 * and provider interactions.
 */

import { Transaction } from '../models/index.js';
import providerRegistry from '../providers/registry.js';
import { queueService } from './index.js';
import { logger } from '../lib/logger.js';

/**
 * Creates a payment intent with the specified provider.
 * @param {Object} paymentData - Validated payment data from the schema.
 * @returns {Promise<Object>} The created transaction with provider details.
 */
export const createPayment = async (paymentData) => {
  const { amount, currency, provider, paymentMethod, returnUrl, cancelUrl, metadata } = paymentData;

  const providerInstance = providerRegistry.getProvider(provider);

  // 1. Persist initial record in PostgreSQL
  const transaction = await Transaction.create({
    externalId: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    amount,
    currency,
    provider,
    paymentMethod: paymentMethod || providerInstance.getSupportedMethods()[0],
    idempotencyKey: `ik_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    status: 'RECEIVED',
    metadata: { returnUrl, cancelUrl, ...metadata },
  });

  // 2. Call the provider to create the payment
  const result = await providerInstance.createPayment({
    amount,
    currency,
    returnUrl: returnUrl || `${process.env.BASE_URL}/api/v1/payments/callback`,
    cancelUrl: cancelUrl || `${process.env.BASE_URL}/api/v1/payments/callback?cancelled=true`,
    metadata: { transactionId: transaction.id },
  });

  // 3. Update transaction with provider details
  await transaction.update({
    providerPaymentId: result.providerPaymentId,
    rawResponse: result,
    status: 'PROCESSING',
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
 * Gets the current status and details of a transaction.
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
 * @returns {Array<{name: string, methods: string[]}>}
 */
export const getAvailableMethods = () => {
  return providerRegistry.listAll();
};