/**
 * @fileoverview Validation schema for payment creation requests.
 * Validates the payload sent by other backends to create a payment intent.
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

  metadata: z.record(z.any()).optional(),
});

export default createPaymentSchema;