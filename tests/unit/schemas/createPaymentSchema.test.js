import { describe, it, expect } from 'vitest';
import createPaymentSchema from '../../../src/schemas/createPaymentSchema.js';

describe('createPaymentSchema', () => {
  const validPayload = {
    amount: 1000,
    currency: 'USD',
    provider: 'paypal',
  };

  it('passes with valid minimal payload', () => {
    const result = createPaymentSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('passes with all optional fields', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayload,
      paymentMethod: 'card',
      returnUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      idempotencyKey: 'ik_12345',
      metadata: { orderId: 'ORD-001' },
    });
    expect(result.success).toBe(true);
  });

  it('normalizes currency to uppercase', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayload,
      currency: 'usd',
    });
    expect(result.success).toBe(true);
    expect(result.data.currency).toBe('USD');
  });

  it('fails when amount is missing', () => {
    const { amount, ...noAmount } = validPayload;
    const result = createPaymentSchema.safeParse(noAmount);
    expect(result.success).toBe(false);
  });

  it('fails when amount is negative', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayload,
      amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it('fails when amount is not an integer', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayload,
      amount: 10.5,
    });
    expect(result.success).toBe(false);
  });

  it('fails when currency is not 3 letters', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayload,
      currency: 'US',
    });
    expect(result.success).toBe(false);
  });

  it('fails when provider is missing', () => {
    const { provider, ...noProvider } = validPayload;
    const result = createPaymentSchema.safeParse(noProvider);
    expect(result.success).toBe(false);
  });

  it('fails when returnUrl is not a valid URL', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayload,
      returnUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('fails when idempotencyKey exceeds 128 chars', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayload,
      idempotencyKey: 'x'.repeat(129),
    });
    expect(result.success).toBe(false);
  });
});