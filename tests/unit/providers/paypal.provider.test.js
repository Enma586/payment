import { describe, it, expect } from 'vitest';
import { PayPalProvider } from '../../../src/providers/paypal/paypal.provider.js';

describe('PayPalProvider', () => {
  const provider = new PayPalProvider();

  it('returns provider name "paypal"', () => {
    expect(provider.getProviderName()).toBe('paypal');
  });

  it('returns supported methods', () => {
    expect(provider.getSupportedMethods()).toEqual(['card', 'paypal']);
  });

  describe('mapStatus', () => {
    const cases = [
      ['CREATED', 'PENDING'],
      ['SAVED', 'PENDING'],
      ['APPROVED', 'PROCESSING'],
      ['COMPLETED', 'COMPLETED'],
      ['VOIDED', 'FAILED'],
      ['PAYER_ACTION_REQUIRED', 'PENDING'],
      ['UNKNOWN_STATUS', 'PENDING'],
    ];

    it.each(cases)('maps "%s" to "%s"', (paypalStatus, expected) => {
      expect(provider.mapStatus(paypalStatus)).toBe(expected);
    });
  });
});