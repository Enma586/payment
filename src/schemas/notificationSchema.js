/**
 * @fileoverview Validation schema for outgoing notifications to client systems.
 * Ensures the data we send is consistent and matches the client's expectations.
 *
 * The notification payload is sent as JSON to the client's webhookUrl via POST.
 * It includes an HMAC signature in the `X-Signature` header so the client
 * can verify the payload authenticity using their shared secret (WEBHOOK_SECRET).
 */

import { z } from 'zod';

/**
 * Schema for the notification payload.
 * This is what the Worker sends to the client's webhook URL.
 *
 * Fields:
 * - transactionId {string} UUID - Internal transaction ID.
 * - externalId    {string}      - Client-facing transaction reference.
 * - status        {string}      - Current status: RECEIVED, PROCESSING, COMPLETED, FAILED, RETRYING.
 * - amount        {number}      - Amount in cents.
 * - currency      {string}      - 3-letter ISO 4217 code.
 * - timestamp     {string}      - ISO 8601 datetime of when the notification was generated.
 */
const notificationSchema = z.object({
  transactionId: z.string().uuid("Invalid internal transaction ID"),
  externalId: z.string(),
  status: z.enum(['RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'REFUNDED']),
  amount: z.number().int(),
  currency: z.string().length(3),
  timestamp: z.string().datetime(),
});

export default notificationSchema;