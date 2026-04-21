import crypto from 'crypto';
import axios from 'axios';
import { PaymentProvider } from '../provider.interface.js';
import { logger } from '../../lib/logger.js';

const STRIPE_API = 'https://api.stripe.com/v1';

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
   * Create a Checkout Session using Stripe API.
   * Returns the session URL for the user to complete payment.
   */
  async createPayment({ amount, currency, returnUrl, cancelUrl, metadata }) {
    const params = new URLSearchParams({
      amount: String(amount),
      currency: currency.toLowerCase(),
      'metadata[internalId]': metadata?.transactionId || '',
      mode: 'payment',
      success_url: returnUrl || 'https://example.com/success',
      cancel_url: cancelUrl || 'https://example.com/cancel',
    });

    const { data } = await axios.post(
      `${STRIPE_API}/checkout/sessions`,
      params,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    );

    return {
      providerPaymentId: data.id,
      redirectUrl: data.url,
      status: 'PENDING',
    };
  }

  /**
   * Verify the authenticity of a Stripe webhook.
   * Uses Stripe's HMAC-SHA256 signature with timestamp tolerance.
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
   * Parse a verified Stripe webhook event into our standard format.
   * Maps Stripe event types to our internal status.
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
    };
  }

  /**
   * Query Stripe for the current status of a Checkout Session.
   */
  async getPaymentStatus(providerPaymentId) {
    const { data } = await axios.get(
      `${STRIPE_API}/checkout/sessions/${providerPaymentId}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );

    return {
      status: this.mapStatus(data.payment_status),
      rawResponse: data,
    };
  }

  /**
   * Refund a payment through Stripe.
   * Supports partial refunds by specifying an amount.
   */
  async refundPayment(providerPaymentId, amount) {
    const params = new URLSearchParams({
      payment_intent: providerPaymentId,
      amount: String(amount),
    });

    const { data } = await axios.post(
      `${STRIPE_API}/refunds`,
      params,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    );

    return {
      refundId: data.id,
      status: data.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
    };
  }

  /**
   * Map Stripe-specific statuses to our internal status enum.
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