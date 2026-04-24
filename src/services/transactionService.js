import { Transaction } from "../models/index.js";
import providerRegistry from "../providers/registry.js";
import { queueService } from "./index.js";
import { logger } from "../lib/logger.js";

export const createPayment = async (paymentData) => {
  const { amount, currency, provider, paymentMethod, returnUrl, cancelUrl, metadata } = paymentData;

  const providerInstance = providerRegistry.getProvider(provider);

  const transaction = await Transaction.create({
    externalId: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    amount,
    currency,
    provider,
    paymentMethod: paymentMethod || providerInstance.getSupportedMethods()[0],
    idempotencyKey: `ik_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    status: "RECEIVED",
    metadata: { returnUrl, cancelUrl, ...metadata },
  });

  const result = await providerInstance.createPayment({
    amount,
    currency,
    returnUrl: returnUrl || `${process.env.BASE_URL}/api/v1/payments/callback`,
    cancelUrl: cancelUrl || `${process.env.BASE_URL}/api/v1/payments/callback?cancelled=true`,
    metadata: { transactionId: transaction.id },
  });

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

export const captureByOrderId = async (orderId) => {
  const transaction = await Transaction.findOne({
    where: { providerPaymentId: orderId },
  });

  if (!transaction) {
    throw new Error(`No transaction found for orderId: ${orderId}`);
  }

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

export const getAvailableMethods = () => {
  return providerRegistry.listAll();
};