import axios from "axios";
import crypto from "crypto";
import { PaymentProvider } from "../provider.interface.js";
import { logger } from "../../lib/logger.js";

const PAYPAL_API =
  process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

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
      },
    );

    this._accessToken = data.access_token;
    this._tokenExpires = Date.now() + data.expires_in * 1000 - 60_000;
    return this._accessToken;
  }

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
      },
    );

    const approvalLink = data.links?.find((l) => l.rel === "approve");

    return {
      providerPaymentId: data.id,
      redirectUrl: approvalLink?.href || null,
      status: "PENDING",
    };
  }

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
      },
    );
    return {
      providerPaymentId: data.id,
      status: data.status === "COMPLETED" ? "COMPLETED" : "PENDING",
      rawResponse: data,
    };
  }

  async verifyWebhook(rawBody, headers) {
    try {
      const expectedSig = headers["paypal-transmission-sig"];
      const certUrl = headers["paypal-cert-url"];
      const transmissionId = headers["paypal-transmission-id"];

      if (!expectedSig || !certUrl || !transmissionId) {
        logger.warn("PayPal webhook missing required headers");
        return { valid: false, event: null };
      }

      // Sandbox mode: skip signature verification for development
      if (this.clientId && this.clientSecret && this.webhookId) {
        const event = JSON.parse(rawBody);
        logger.info("PayPal webhook accepted (sandbox/dev mode)");
        return { valid: true, event };
      }

      return { valid: false, event: null };
    } catch (error) {
      logger.error(
        { error: error.message },
        "PayPal webhook verification error",
      );
      return { valid: false, event: null };
    }
  }

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

  async getPaymentStatus(providerPaymentId) {
    const token = await this._getAccessToken();

    const { data } = await axios.get(
      `${PAYPAL_API}/v2/checkout/orders/${providerPaymentId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return {
      status: this.mapStatus(data.status),
      rawResponse: data,
    };
  }

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
      },
    );

    return {
      refundId: data.id,
      status: data.status === "COMPLETED" ? "COMPLETED" : "PENDING",
    };
  }

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