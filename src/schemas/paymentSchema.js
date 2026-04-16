/**
 * @fileoverview Validation schema for incoming payment webhooks.
 * Using Zod for type-safe and robust data validation.
 */

import { z } from 'zod';

/**
 * Schema for the payment webhook payload.
 * Validates the core data needed to process a transaction.
 */
const paymentSchema = z.object({
  externalId: z.string({
    required_error: "External ID is required",
  }).min(1, "External ID cannot be empty"),
  
  amount: z.number({
    required_error: "Amount is required",
    invalid_type_error: "Amount must be a number",
  }).int().positive("Amount must be a positive integer in cents"),
  
  currency: z.string().length(3).transform((val) => val.toUpperCase()),
  
  idempotencyKey: z.string({
    required_error: "Idempotency Key is required",
  }),
  
  // We can also validate the raw response if we want it to follow a structure
  rawResponse: z.record(z.any()).optional(),
});

export default paymentSchema;