/**
 * @openapi
 * /api/v1/webhooks/{provider}:
 *   post:
 *     tags: [Webhooks]
 *     summary: Receive webhook from a payment provider
 *     description: Dynamic endpoint that receives webhooks from payment providers (paypal). Each provider verifies its own signature internally.
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [paypal]
 *         description: Payment provider name
 *         example: paypal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Webhook payload (varies by provider)
 *           example:
 *             event_type: CHECKOUT.ORDER.APPROVED
 *             resource:
 *               id: 5O190127TN364715T
 *               status: COMPLETED
 *               purchase_units:
 *                 - amount:
 *                     value: "10.00"
 *                     currency_code: USD
 *               custom_id: d1a2b3c4-5678-90ab-cdef-1234567890ab
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Webhook processed
 *       403:
 *         description: Invalid webhook signature
 *
 * /api/v1/payments/webhook:
 *   post:
 *     tags: [Webhooks]
 *     summary: Legacy webhook (backward compatibility)
 *     description: Webhook endpoint with shared HMAC signature validation. Processes external payment notifications.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [externalId, amount, currency, idempotencyKey]
 *             properties:
 *               externalId:
 *                 type: string
 *                 description: External transaction ID
 *                 example: tx_abc123
 *               amount:
 *                 type: integer
 *                 description: Amount in cents
 *                 example: 1000
 *               currency:
 *                 type: string
 *                 description: ISO 4217 currency code
 *                 example: USD
 *               idempotencyKey:
 *                 type: string
 *                 description: Idempotency key
 *               rawResponse:
 *                 type: object
 *                 description: Additional webhook data
 *           example:
 *             externalId: ext-payment-999
 *             amount: 2500
 *             currency: USD
 *             idempotencyKey: webhook-unique-v3-001
 *             rawResponse:
 *               source: external-system
 *               reference: INV-2026-001
 *     responses:
 *       201:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Webhook processed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: RECEIVED
 *           example:
 *             status: success
 *             message: Webhook processed successfully
 *             data:
 *               id: d1a2b3c4-5678-90ab-cdef-1234567890ab
 *               status: RECEIVED
 *       401:
 *         description: Invalid signature
 */
