/**
 * @fileoverview PayPal Payment Provider.
 * Implements the PaymentProvider interface for PayPal Orders API v2.
 *
 * Flow:
 *   1. createPayment()    → Creates a PayPal Order, returns approval redirect URL.
 *   2. User approves       → PayPal redirects to return_url with ?token=ORDER_ID.
 *   3. capturePayment()   → Captures the approved order via PayPal API.
 *   4. Webhook (optional) → PayPal sends CHECKOUT.ORDER.APPROVED on approval.
 *
 * Security:
 *   - Webhook signature verification via PayPal API (production) or skip flag (sandbox).
 *   - All outgoing requests have a 15-second timeout to prevent hanging.
 *   - The internal transaction ID is stored in `custom_id` for webhook correlation.
 */

import axios from "axios";
import { PaymentProvider } from "../provider.interface.js";
import { logger } from "../../lib/logger.js";

const PAYPAL_API =
  process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

const REQUEST_TIMEOUT = 15_000; // 15 seconds

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
    return "paypal";
  }

  getSupportedMethods() {
    return ["card", "paypal"];
  }

  /**
   * Gets a cached PayPal access token, or requests a new one if expired.
   *
   * @returns {Promise<string>} A valid OAuth2 access token.
   */
  async _getAccessToken() {
    if (this._accessToken && Date.now() < this._tokenExpires) {
      return this._accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64",
    );
    const { data } = await axios.post(
      `${PAYPAL_API}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: REQUEST_TIMEOUT,
      },
    );

    this._accessToken = data.access_token;
    this._tokenExpires = Date.now() + data.expires_in * 1000 - 60_000;
    return this._accessToken;
  }

  /**
   * Creates a PayPal Order for checkout.
   *
   * The internal transaction ID is stored in `purchase_units[0].custom_id`
   * so it can be retrieved in webhooks and callbacks for correlation.
   *
   * @param {Object} params
   * @param {number} params.amount - Amount in cents.
   * @param {string} params.currency - 3-letter currency code.
   * @param {string} [params.returnUrl] - URL for successful payment redirect.
   * @param {string} [params.cancelUrl] - URL for cancelled payment redirect.
   * @param {Object} [params.metadata] - Must include `transactionId`.
   * @returns {Promise<{providerPaymentId: string, redirectUrl: string|null, status: string}>}
   */
  async createPayment({ amount, currency, returnUrl, cancelUrl, metadata }) {
    const token = await this._getAccessToken();

    const { data } = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: (amount / 100).toFixed(2),
            },
            custom_id: metadata?.transactionId || undefined,
          },
        ],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: REQUEST_TIMEOUT,
      },
    );

    const approvalLink = data.links?.find((l) => l.rel === "approve");

    return {
      providerPaymentId: data.id,
      redirectUrl: approvalLink?.href || null,
      status: "PENDING",
    };
  }

  /**
   * Captures an approved PayPal Order.
   *
   * Called after the user approves the payment on PayPal's checkout page.
   * This finalizes the payment and transfers the funds.
   *
   * @param {string} orderId - The PayPal Order ID (e.g. "5O190127TN364715T").
   * @returns {Promise<{providerPaymentId: string, status: string, rawResponse: Object}>}
   */
  async capturePayment(orderId) {
    const token = await this._getAccessToken();
    const { data } = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: REQUEST_TIMEOUT,
      },
    );
    return {
      providerPaymentId: data.id,
      status: data.status === "COMPLETED" ? "COMPLETED" : "PENDING",
      rawResponse: data,
    };
  }

  /**
   * Verifies the authenticity of a PayPal webhook.
   *
   * In sandbox mode (PAYPAL_SKIP_VERIFY=true), the signature check is skipped
   * for development convenience.
   *
   * In production, calls PayPal's verify-webhook-signature API to validate
   * the transmission using the webhook ID, certificate, and signature.
   *
   * @param {string} rawBody - Raw request body string.
   * @param {Object} headers - Request headers with PayPal transmission headers.
   * @returns {Promise<{valid: boolean, event: Object|null}>}
   */
  async verifyWebhook(rawBody, headers) {
    try {
      const transmissionId = headers["paypal-transmission-id"];
      const transmissionSig = headers["paypal-transmission-sig"];
      const certUrl = headers["paypal-cert-url"];
      const transmissionTime = headers["paypal-transmission-time"];
      const authAlgo = headers["paypal-auth-algo"] || "SHA256withRSA";

      if (!transmissionId || !transmissionSig || !certUrl) {
        logger.warn("PayPal webhook missing required headers");
        return { valid: false, event: null };
      }

      const event = JSON.parse(rawBody);

      // Sandbox/dev mode: skip verification if PAYPAL_SKIP_VERIFY is set
      if (process.env.PAYPAL_SKIP_VERIFY === "true") {
        logger.info("PayPal webhook accepted (sandbox/dev mode - skip verify)");
        return { valid: true, event };
      }

      // Production: verify via PayPal API
      const token = await this._getAccessToken();

      const { data } = await axios.post(
        `${PAYPAL_API}/v1/notifications/verify-webhook-signature`,
        {
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo,
          transmission_sig: transmissionSig,
          webhook_id: this.webhookId,
          webhook_event: event,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: REQUEST_TIMEOUT,
        },
      );

      if (data.verification_status === "SUCCESS") {
        logger.info("PayPal webhook signature verified");
        return { valid: true, event };
      }

      logger.warn("PayPal webhook signature verification failed");
      return { valid: false, event: null };
    } catch (error) {
      logger.error(
        { error: error.message },
        "PayPal webhook verification error",
      );
      return { valid: false, event: null };
    }
  }

  /**
   * Parses a PayPal webhook event into the standard internal format.
   *
   * Supported events:
   * - CHECKOUT.ORDER.APPROVED   → COMPLETED (extracts custom_id as internalTransactionId).
   * - PAYMENT.CAPTURE.COMPLETED → PENDING (capture confirmation, amount extracted).
   *
   * @param {Object} event - The verified PayPal webhook event.
   * @returns {{providerPaymentId: string, status: string, amount: number|null, internalTransactionId: string|null}}
   */
  parseWebhookEvent(event) {
    const resource = event.resource || {};
    const eventType = event.event_type;

    let providerPaymentId = resource.id;
    let status = "PENDING";
    let amount = null;
    let internalTransactionId = null;

    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      providerPaymentId = resource.id;
      status = "COMPLETED";
      amount = resource.purchase_units?.[0]?.amount?.value
        ? Math.round(parseFloat(resource.purchase_units[0].amount.value) * 100)
        : null;
      internalTransactionId = resource.purchase_units?.[0]?.custom_id || null;
    } else if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      amount = resource.amount?.value
        ? Math.round(parseFloat(resource.amount.value) * 100)
        : null;
    }

    return {
      providerPaymentId,
      status,
      amount,
      internalTransactionId,
    };
  }

  /**
   * Queries PayPal for the current status of an Order.
   *
   * @param {string} providerPaymentId - The PayPal Order ID.
   * @returns {Promise<{status: string, rawResponse: Object}>}
   */
  async getPaymentStatus(providerPaymentId) {
    const token = await this._getAccessToken();

    const { data } = await axios.get(
      `${PAYPAL_API}/v2/checkout/orders/${providerPaymentId}`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: REQUEST_TIMEOUT },
    );

    return {
      status: this.mapStatus(data.status),
      rawResponse: data,
    };
  }

  /**
   * Refunds a captured payment through PayPal.
   *
   * Note: The providerPaymentId for refunds must be the Capture ID,
   * not the Order ID. The Capture ID is available in rawResponse from capturePayment().
   *
   * @param {string} providerPaymentId - The PayPal Capture ID.
   * @param {number} amount - Amount to refund in cents.
   * @returns {Promise<{refundId: string, status: string}>}
   */
  async refundPayment(providerPaymentId, amount) {
    const token = await this._getAccessToken();

    const { data } = await axios.post(
      `${PAYPAL_API}/v2/payments/captures/${providerPaymentId}/refund`,
      { amount: { value: (amount / 100).toFixed(2), currency_code: "USD" } },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: REQUEST_TIMEOUT,
      },
    );

    return {
      refundId: data.id,
      status: data.status === "COMPLETED" ? "COMPLETED" : "PENDING",
    };
  }

  /**
   * Maps PayPal Order statuses to our internal status enum.
   *
   * @param {string} paypalStatus - PayPal order status value.
   * @returns {string} One of: PENDING, PROCESSING, COMPLETED, FAILED.
   */
  mapStatus(paypalStatus) {
    const map = {
      CREATED: "PENDING",
      SAVED: "PENDING",
      APPROVED: "PROCESSING",
      VOIDED: "FAILED",
      COMPLETED: "COMPLETED",
      PAYER_ACTION_REQUIRED: "PENDING",
    };
    return map[paypalStatus] || "PENDING";
  }
}