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
        }
      }
    );

    return {
      providerPaymentId: data.id,
      paymentIntentId: data.payment_intent,
      redirectUrl: data.url,
      status: 'PENDING',
    };
  }

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
      const toleranceMs = 5 * 60 * 1000;
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - parseInt(timestamp)) > toleranceMs / 1000) {
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

  async getSessionStatus(sessionId) {
    const { data } = await axios.get(
      `${STRIPE_API}/checkout/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );

    return {
      status: this.mapStatus(data.payment_status),
      paymentIntentId: data.payment_intent,
      rawResponse: data,
    };
  }

  async getPaymentStatus(providerPaymentId) {
    return this.getSessionStatus(providerPaymentId);
  }

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
        }
      }
    );

    return {
      refundId: data.id,
      status: data.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
    };
  }

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