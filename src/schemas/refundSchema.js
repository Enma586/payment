/**
 * @fileoverview Validation schema for refund requests.
 *
 * Fields:
 * - amount {number} Optional. Positive integer in cents for partial refunds.
 *                   If omitted, refunds the full transaction amount.
 * - reason {string} Optional. Reason for the refund. Max 500 characters.
 */

import { z } from 'zod';

const refundSchema = z.object({
  amount: z.number()
    .int('Amount must be an integer')
    .positive('Amount must be positive (in cents)')
    .optional(),

  reason: z.string()
    .max(500, 'Reason must be at most 500 characters')
    .optional(),
});

export default refundSchema;