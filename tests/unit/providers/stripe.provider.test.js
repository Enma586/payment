import { describe, it, expect } from 'vitest';
import { StripeProvider } from '../../../src/providers/stripe/stripe.provider.js';

describe('StripeProvider', () => {
  const provider = new StripeProvider();

  it('returns provider name "stripe"', () => {
    expect(provider.getProviderName()).toBe('stripe');
  });

  it('returns supported methods', () => {
    expect(provider.getSupportedMethods()).toEqual(['card', 'apple_pay', 'google_pay']);
  });

  describe('mapStatus', () => {
    const cases = [
      ['paid', 'COMPLETED'],
      ['unpaid', 'PENDING'],
      ['no_payment_required', 'COMPLETED'],
      ['canceled', 'FAILED'],
      ['unknown_status', 'PENDING'],
    ];

    it.each(cases)('maps "%s" to "%s"', (stripeStatus, expected) => {
      expect(provider.mapStatus(stripeStatus)).toBe(expected);
    });
  });

  describe('parseWebhookEvent', () => {
    it('parses checkout.session.completed', () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            amount_total: 1000,
            metadata: { internalId: 'tx-uuid-123' },
            payment_intent: 'pi_test_123',
          },
        },
      };

      const parsed = provider.parseWebhookEvent(event);
      expect(parsed.providerPaymentId).toBe('cs_test_123');
      expect(parsed.status).toBe('COMPLETED');
      expect(parsed.amount).toBe(1000);
      expect(parsed.internalTransactionId).toBe('tx-uuid-123');
      expect(parsed.paymentIntentId).toBe('pi_test_123');
    });

    it('parses checkout.session.expired as FAILED', () => {
      const event = {
        type: 'checkout.session.expired',
        data: { object: { id: 'cs_expired' } },
      };

      const parsed = provider.parseWebhookEvent(event);
      expect(parsed.status).toBe('FAILED');
    });
  });
});