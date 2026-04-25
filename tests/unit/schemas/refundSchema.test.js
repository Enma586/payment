import { describe, it, expect } from 'vitest';
import refundSchema from '../../../src/schemas/refundSchema.js';

describe('refundSchema', () => {
  it('passes with empty body (full refund)', () => {
    const result = refundSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('passes with valid amount (partial refund)', () => {
    const result = refundSchema.safeParse({ amount: 500 });
    expect(result.success).toBe(true);
    expect(result.data.amount).toBe(500);
  });

  it('passes with reason', () => {
    const result = refundSchema.safeParse({ reason: 'Customer request' });
    expect(result.success).toBe(true);
  });

  it('passes with both amount and reason', () => {
    const result = refundSchema.safeParse({ amount: 500, reason: 'Partial refund' });
    expect(result.success).toBe(true);
  });

  it('fails with negative amount', () => {
    const result = refundSchema.safeParse({ amount: -100 });
    expect(result.success).toBe(false);
  });

  it('fails with zero amount', () => {
    const result = refundSchema.safeParse({ amount: 0 });
    expect(result.success).toBe(false);
  });

  it('fails with non-integer amount', () => {
    const result = refundSchema.safeParse({ amount: 10.5 });
    expect(result.success).toBe(false);
  });

  it('fails when reason exceeds 500 chars', () => {
    const result = refundSchema.safeParse({ reason: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });
});