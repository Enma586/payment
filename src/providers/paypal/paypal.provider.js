import axios from 'axios';
import crypto from 'crypto';
import { PaymentProvider } from '../provider.interface.js';
import { logger } from '../../lib/logger.js';

const PAYPAL_API = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

export class PayPalProvider extends PaymentProvider {

  constructor() {
    super();
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.webhookId = process.env.PAYPAL_WEBHOOK_ID;
    this._accessToken = null;
    this._tokenExpires = 0;
  }

  getProviderName() {
    return 'paypal';
  }

  getSupportedMethods() {
    return ['card', 'paypal'];
  }

  /**
   * Get PayPal OAuth access token with in-memory cache.
   * Avoids requesting a new token on every API call.
   */
  async _getAccessToken() {
    if (this._accessToken && Date.now() < this._tokenExpires) {
      return this._accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const { data } = await axios.post(
      `${PAYPAL_API}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    );

    this._accessToken = data.access_token;
    // Subtract 60s to avoid edge cases near expiration
    this._tokenExpires = Date.now() + (data.expires_in * 1000) - 60_000;
    return this._accessToken;
  }

  /**
   * Create a payment order using PayPal Orders API v2.
   * Returns the approval redirect URL for the user.
   */
  async createPayment({ amount, currency, returnUrl, cancelUrl, metadata }) {
    const token = await this._getAccessToken();

    const { data } = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: currency, value: (amount / 100).toFixed(2) },
          custom_id: metadata?.transactionId || undefined,
        }],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const approvalLink = data.links?.find(l => l.rel === 'approve');

    return {
      providerPaymentId: data.id,
      redirectUrl: approvalLink?.href || null,
      status: 'PENDING',
    };
  }

  /**
   * Verify the authenticity of a PayPal webhook.
   * Uses PayPal's certificate-based signature verification.
   */
  async verifyWebhook(rawBody, headers) {
    try {
      const expectedSig = headers['paypal-transmission-sig'];
      const certUrl = headers['paypal-cert-url'];
      const transmissionId = headers['paypal-transmission-id'];
      const transmissionTime = headers['paypal-transmission-time'];

      if (!expectedSig || !certUrl || !transmissionId) {
        logger.warn('PayPal webhook missing required headers');
        return { valid: false, event: null };
      }

      // Fetch the certificate from PayPal
      const { data: cert } = await axios.get(certUrl);

      // Reconstruct the expected signature payload
      const sigPayload = `${transmissionId}|${transmissionTime}|${this.webhookId}|${crypto.createHash('sha256').update(rawBody).digest('hex')}`;

      // Verify the signature against the certificate
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(sigPayload);
      const valid = verifier.verify(cert, expectedSig, 'base64');

      if (!valid) {
        logger.warn('PayPal webhook signature verification failed');
        return { valid: false, event: null };
      }

      const event = JSON.parse(rawBody);
      return { valid: true, event };

    } catch (error) {
      logger.error({ error: error.message }, 'PayPal webhook verification error');
      return { valid: false, event: null };
    }
  }

  /**
   * Parse a verified PayPal webhook event into our standard format.
   */
  parseWebhookEvent(event) {
    const resource = event.resource || {};

    return {
      providerPaymentId: resource.id,
      status: this.mapStatus(resource.status),
      amount: resource.amount?.value
        ? Math.round(parseFloat(resource.amount.value) * 100)
        : null,
    };
  }

  /**
   * Query PayPal for the current status of an order.
   */
  async getPaymentStatus(providerPaymentId) {
    const token = await this._getAccessToken();

    const { data } = await axios.get(
      `${PAYPAL_API}/v2/checkout/orders/${providerPaymentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return {
      status: this.mapStatus(data.status),
      rawResponse: data,
    };
  }

  /**
   * Refund a captured payment through PayPal.
   */
  async refundPayment(providerPaymentId, amount) {
    const token = await this._getAccessToken();

    const { data } = await axios.post(
      `${PAYPAL_API}/v2/payments/captures/${providerPaymentId}/refund`,
      { amount: { value: (amount / 100).toFixed(2), currency_code: 'USD' } },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );

    return {
      refundId: data.id,
      status: data.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
    };
  }

  /**
   * Map PayPal-specific statuses to our internal status enum.
   */
  mapStatus(paypalStatus) {
    const map = {
      'CREATED': 'PENDING',
      'SAVED': 'PENDING',
      'APPROVED': 'PROCESSING',
      'VOIDED': 'FAILED',
      'COMPLETED': 'COMPLETED',
      'PAYER_ACTION_REQUIRED': 'PENDING',
    };
    return map[paypalStatus] || 'PENDING';
  }
}