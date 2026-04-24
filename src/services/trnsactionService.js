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

  // PayPal requires the Capture ID (not Order ID) for refunds.
  // The Capture ID is stored in rawResponse after capturePayment().
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