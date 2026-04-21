/**
 * @fileoverview Abstract base class that every payment provider must implement.
 * Any new provider (PayPal, Stripe, MercadoPago) must extend this class.
 */
export class PaymentProvider {
  /** @returns {string} Provider name e.g. "paypal", "stripe" */
  getProviderName() {
    throw new Error('getProviderName() must be implemented');
  }

  /** @returns {string[]} Supported payment methods e.g. ["card", "paypal"] */
  getSupportedMethods() {
    throw new Error('getSupportedMethods() must be implemented');
  }

  /**
   * Create a payment intent with the provider.
   * @param {Object} data - { amount, currency, returnUrl, cancelUrl, metadata }
   * @returns {Promise<{providerPaymentId: string, redirectUrl: string|null, status: string}>}
   */
  async createPayment(data) {
    throw new Error('createPayment() must be implemented');
  }

  /**
   * Verify that an incoming webhook is authentic.
   * @param {string} rawBody - Raw request body string
   * @param {Object} headers - Request headers
   * @returns {Promise<{valid: boolean, event: Object|null}>}
   */
  async verifyWebhook(rawBody, headers) {
    throw new Error('verifyWebhook() must be implemented');
  }

  /**
   * Parse a verified webhook into our standard format.
   * @param {Object} event - The verified event from verifyWebhook()
   * @returns {{providerPaymentId: string, status: string, amount: number|null}}
   */
  parseWebhookEvent(event) {
    throw new Error('parseWebhookEvent() must be implemented');
  }

  /**
   * Query the provider for the current status of a payment.
   * @param {string} providerPaymentId
   * @returns {Promise<{status: string, rawResponse: Object}>}
   */
  async getPaymentStatus(providerPaymentId) {
    throw new Error('getPaymentStatus() must be implemented');
  }

  /**
   * Refund a payment.
   * @param {string} providerPaymentId
   * @param {number} amount - Amount in cents (partial refund if less than original)
   * @returns {Promise<{refundId: string, status: string}>}
   */
  async refundPayment(providerPaymentId, amount) {
    throw new Error('refundPayment() must be implemented');
  }

  /**
   * Map provider-specific status to our internal status enum.
   * @param {string} providerStatus
   * @returns {string} One of: PENDING, PROCESSING, COMPLETED, FAILED
   */
  mapStatus(providerStatus) {
    throw new Error('mapStatus() must be implemented');
  }
}