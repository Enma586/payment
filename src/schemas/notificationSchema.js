/**
 * @fileoverview Validation schema for outgoing notifications to client systems.
 * Ensures the data we send is consistent and matches the client's expectations.
 */

import { z } from 'zod';

/**
 * Schema for the notification payload.
 * This is what the Worker will send to the client's webhook URL.
 */
const notificationSchema = z.object({
  transactionId: z.string().uuid("Invalid internal transaction ID"),
  externalId: z.string(),
  status: z.enum(['COMPLETED', 'FAILED', 'RETRYING']),
  amount: z.number().int(),
  currency: z.string().length(3),
  timestamp: z.string().datetime(), // ISO 8601 string
});

export default notificationSchema;