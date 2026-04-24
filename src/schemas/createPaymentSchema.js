/**
 * @fileoverview Validation schema for payment creation requests.
 * Validates the payload sent by other backends to create a payment intent.
 *
 * Fields:
 * - amount        {number}  Required. Positive integer in cents (e.g. 1000 = $10.00).
 * - currency      {string}  Required. 3-letter ISO 4217 code (e.g. "USD").
 * - provider      {string}  Required. Name of the payment provider (e.g. "paypal", "stripe").
 * - paymentMethod {string}  Optional. Method to use (e.g. "card", "paypal").
 *                           Defaults to the first method supported by the provider.
 * - returnUrl     {string}  Optional. URL to redirect the user after a successful payment.
 * - cancelUrl     {string}  Optional. URL to redirect the user if they cancel the payment.
 * - idempotencyKey {string} Optional. Client-generated key to prevent duplicate transactions.
 *                           If a transaction with this key already exists, the existing one is
 *                           returned instead of creating a new one. Max 128 characters.
 * - metadata      {object}  Optional. Arbitrary key-value pairs for the client's own use.
 */

import { z } from 'zod';

const createPaymentSchema = z.object({
  amount: z.number({
    required_error: 'Amount is required',
    invalid_type_error: 'Amount must be a number',
  }).int().positive('Amount must be a positive integer in cents'),

  currency: z.string()
    .length(3, 'Currency must be a 3-letter code')
    .transform((val) => val.toUpperCase()),

  provider: z.string({
    required_error: 'Provider is required',
  }).min(1, 'Provider cannot be empty'),

  paymentMethod: z.string().optional(),

  returnUrl: z.string().url('Return URL must be a valid URL').optional(),
  cancelUrl: z.string().url('Cancel URL must be a valid URL').optional(),

  idempotencyKey: z.string()
    .min(1, 'Idempotency key cannot be empty')
    .max(128, 'Idempotency key must be at most 128 characters')
    .optional(),

  metadata: z.record(z.any()).optional(),
});

export default createPaymentSchema;