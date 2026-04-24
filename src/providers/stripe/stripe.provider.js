/**
 * @fileoverview Stripe Payment Provider.
 * Implements the PaymentProvider interface for Stripe Checkout Sessions.
 *
 * Flow:
 *   1. createPayment()    → Creates a Stripe Checkout Session, returns redirect URL.
 *   2. User pays on Stripe → Stripe redirects to success_url with session_id.
 *   3. Stripe sends webhook → verifyWebhook() validates HMAC-SHA256 signature.
 *   4. parseWebhookEvent() → Maps Stripe events to internal status format.
 *
 * Notes:
 *   - The providerPaymentId stored is a Checkout Session ID (cs_xxx).
 *   - For refunds, the session is resolved to a Payment Intent ID automatically.
 *   - Webhook verification includes a 5-minute timestamp tolerance to prevent replay attacks.
 */

import crypto from 'crypto';
import axios from 'axios';
import { PaymentProvider } from '../provider.interface.js';
import { logger } from '../../lib/logger.js';

const STRIPE_API = 'https://api.stripe.com/v1';
const REQUEST_TIMEOUT = 15_000; // 15 seconds

export class StripeProvider extends PaymentProvider {

  constructor() {
    super();
    this.apiKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  getProviderName() {
    return 'stripe';
  }

  getSupportedMethods() {
    return ['card', 'apple_pay', 'google_pay'];
  }

  /**
   * Creates a Stripe Checkout Session for a one-time payment.
   *
   * The `success_url` includes `{CHECKOUT_SESSION_ID}` as a placeholder
   * that Stripe replaces with the actual session ID on redirect.
   * The internal transaction ID is stored in `metadata.internalId` for
   * webhook and callback correlation.
   *
   * @param {Object} params
   * @param {number} params.amount - Amount in cents.
   * @param {string} params.currency - 3-letter currency code.
   * @param {string} [params.returnUrl] - Success redirect URL.
   * @param {string} [params.cancelUrl] - Cancel redirect URL.
   * @param {Object} [params.metadata] - Must include `transactionId`.
   * @returns {Promise<{providerPaymentId: string, paymentIntentId: string|null, redirectUrl: string, status: string}>}
   */
  async createPayment({ amount, currency, returnUrl, cancelUrl, metadata }) {
    const params = new URLSearchParams({
      amount: String(amount),
      currency: currency.toLowerCase(),
      'metadata[internalId]': metadata?.transactionId || '',
      mode: 'payment',
      success_url: returnUrl
        ? `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`
        : `${process.env.BASE_URL}/api/v1/payments/callback/stripe?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.BASE_URL}/api/v1/payments/callback/stripe?cancelled=true`,
    });

    const { data } = await axios.post(
      `${STRIPE_API}/checkout/sessions`,
      params,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: REQUEST_TIMEOUT,
      }
    );

    return {
      providerPaymentId: data.id,
      paymentIntentId: data.payment_intent,
      redirectUrl: data.url,
      status: 'PENDING',
    };
  }

  /**
   * Verifies the authenticity of a Stripe webhook using HMAC-SHA256.
   *
   * Stripe signs the payload with format: `t=timestamp,v1=signature`.
   * This method reconstructs the signature and compares it.
   * Webhooks older than 5 minutes are rejected to prevent replay attacks.
   *
   * @param {string} rawBody - Raw request body string.
   * @param {Object} headers - Request headers (must include `stripe-signature`).
   * @returns {Promise<{valid: boolean, event: Object|null}>}
   */
  async verifyWebhook(rawBody, headers) {
    try {
      const signature = headers['stripe-signature'];
      if (!signature) {
        logger.warn('Stripe webhook missing stripe-signature header');
        return { valid: false, event: null };
      }

      // Parse the Stripe signature header: t=timestamp,v1=signature
      const elements = signature.split(',');
      const sigMap = {};
      for (const el of elements) {
        const [key, ...val] = el.split('=');
        sigMap[key.trim()] = val.join('=');
      }

      const timestamp = sigMap['t'];
      const expectedSig = sigMap['v1'];

      if (!timestamp || !expectedSig) {
        return { valid: false, event: null };
      }

      // Timestamp tolerance: reject webhooks older than 5 minutes
      const toleranceSec = 5 * 60;
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - parseInt(timestamp)) > toleranceSec) {
        logger.warn('Stripe webhook timestamp outside tolerance');
        return { valid: false, event: null };
      }

      // Reconstruct the signed payload: timestamp.rawBody
      const signedPayload = `${timestamp}.${rawBody}`;
      const computedSig = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      if (computedSig !== expectedSig) {
        logger.warn('Stripe webhook signature mismatch');
        return { valid: false, event: null };
      }

      const event = JSON.parse(rawBody);
      return { valid: true, event };

    } catch (error) {
      logger.error({ error: error.message }, 'Stripe webhook verification error');
      return { valid: false, event: null };
    }
  }

  /**
   * Parses a verified Stripe webhook event into the standard internal format.
   *
   * Supported events:
   * - checkout.session.completed → COMPLETED
   * - checkout.session.expired   → FAILED
   * - payment_intent.payment_failed → FAILED
   *
   * @param {Object} event - The verified Stripe event object.
   * @returns {{providerPaymentId: string, status: string, amount: number|null, internalTransactionId: string|null, paymentIntentId: string|null}}
   */
  parseWebhookEvent(event) {
    const object = event.data?.object || {};
    const eventType = event.type;

    let status = 'PENDING';
    if (eventType === 'checkout.session.completed') status = 'COMPLETED';
    else if (eventType === 'checkout.session.expired') status = 'FAILED';
    else if (eventType === 'payment_intent.payment_failed') status = 'FAILED';

    return {
      providerPaymentId: object.id,
      status,
      amount: object.amount_total || object.amount || null,
      internalTransactionId: object.metadata?.internalId || null,
      paymentIntentId: object.payment_intent || null,
    };
  }

  /**
   * Queries Stripe for the current status of a Checkout Session.
   *
   * @param {string} sessionId - The Checkout Session ID (cs_xxx).
   * @returns {Promise<{status: string, paymentIntentId: string|null, rawResponse: Object}>}
   */
  async getSessionStatus(sessionId) {
    const { data } = await axios.get(
      `${STRIPE_API}/checkout/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` }, timeout: REQUEST_TIMEOUT }
    );

    return {
      status: this.mapStatus(data.payment_status),
      paymentIntentId: data.payment_intent,
      rawResponse: data,
    };
  }

  /**
   * Gets the payment status by provider payment ID.
   * Delegates to getSessionStatus().
   *
   * @param {string} providerPaymentId - The Checkout Session ID.
   * @returns {Promise<{status: string, paymentIntentId: string|null, rawResponse: Object}>}
   */
  async getPaymentStatus(providerPaymentId) {
    return this.getSessionStatus(providerPaymentId);
  }

  /**
   * Refunds a payment through Stripe.
   *
   * Since we store the Checkout Session ID (not the Payment Intent ID),
   * this method first resolves the session to get the Payment Intent,
   * then creates the refund.
   *
   * Supports partial refunds by specifying an amount less than the original.
   *
   * @param {string} providerPaymentId - The Checkout Session ID (cs_xxx).
   * @param {number} amount - Amount to refund in cents.
   * @returns {Promise<{refundId: string, status: string}>}
   * @throws {Error} If no payment_intent is found for the session.
   */
  async refundPayment(providerPaymentId, amount) {
    // First, get the payment_intent from the session
    const session = await this.getSessionStatus(providerPaymentId);
    const paymentIntentId = session.paymentIntentId;

    if (!paymentIntentId) {
      throw new Error('Cannot refund: no payment_intent found for this session');
    }

    const params = new URLSearchParams({
      payment_intent: paymentIntentId,
      amount: String(amount),
    });

    const { data } = await axios.post(
      `${STRIPE_API}/refunds`,
      params,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: REQUEST_TIMEOUT,
      }
    );

    return {
      refundId: data.id,
      status: data.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
    };
  }

  /**
   * Maps Stripe-specific payment statuses to our internal status enum.
   *
   * @param {string} stripeStatus - Stripe payment_status value.
   * @returns {string} One of: COMPLETED, PENDING, FAILED.
   */
  mapStatus(stripeStatus) {
    const map = {
      'paid': 'COMPLETED',
      'unpaid': 'PENDING',
      'no_payment_required': 'COMPLETED',
      'canceled': 'FAILED',
    };
    return map[stripeStatus] || 'PENDING';
  }
}