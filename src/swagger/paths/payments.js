/**
 * @openapi
 * /api/v1/payments/create:
 *   post:
 *     tags: [Payments]
 *     summary: Create a payment intent
 *     description: |
 *       Creates a payment with the specified provider. Returns a redirect URL for the client.
 *
 *       **How to complete the payment:**
 *       1. Create the payment here — you'll receive a `transactionId` and `redirectUrl`
 *       2. Open the `redirectUrl` in a browser
 *       3. Log into PayPal (sandbox) and approve the payment
 *       4. PayPal automatically redirects back and the transaction becomes `COMPLETED`
 *       5. Check the status with `GET /api/v1/payments/{id}/status`
 *
 *       **Sandbox test account:**
 *       - Email: `sb-5evpo51532843@personal.example.com`
 *       - Password: `/kd*w{2I`
 *
 *       **Idempotency:** Sending the same `idempotencyKey` again does not create a duplicate.
 *       Instead, it returns the existing transaction with status `200` instead of `201`.
 *       Useful for retries without risk of double charging.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentInput'
 *           example:
 *             amount: 1000
 *             currency: USD
 *             provider: paypal
 *             paymentMethod: paypal
 *             returnUrl: https://mymerchant.com/success
 *             cancelUrl: https://mymerchant.com/cancel
 *             webhookUrl: https://mymerchant.com/webhooks/payments
 *             idempotencyKey: order-customer-abc-001
 *             metadata:
 *               orderId: ORD-12345
 *     responses:
 *       201:
 *         description: Payment created successfully (new transaction)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *           example:
 *             status: success
 *             data:
 *               transactionId: d1a2b3c4-5678-90ab-cdef-1234567890ab
 *               providerPaymentId: 5O190127TN364715T
 *               redirectUrl: https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T
 *               status: PROCESSING
 *       200:
 *         description: Existing transaction returned (same idempotencyKey — no double charge)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *           example:
 *             status: success
 *             data:
 *               transactionId: d1a2b3c4-5678-90ab-cdef-1234567890ab
 *               providerPaymentId: 5O190127TN364715T
 *               redirectUrl: https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T
 *               status: PROCESSING
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid or missing API key
 *
 * /api/v1/payments/{id}/status:
 *   get:
 *     tags: [Payments]
 *     summary: Get transaction status
 *     description: |
 *       Returns the current status and details of a transaction by its UUID.
 *
 *       **State machine:** `RECEIVED` → `PROCESSING` → `COMPLETED` / `FAILED` / `REFUNDED`
 *       - Use the `transactionId` you received when creating the payment.
 *       - Once PayPal completes the payment and sends the webhook, the status changes to `COMPLETED`.
 *       - If the payment was refunded, the status changes to `REFUNDED`.
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Transaction UUID
 *         example: d1a2b3c4-5678-90ab-cdef-1234567890ab
 *     responses:
 *       200:
 *         description: Transaction status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 *           example:
 *             status: success
 *             data:
 *               id: d1a2b3c4-5678-90ab-cdef-1234567890ab
 *               status: COMPLETED
 *               amount: 1000
 *               currency: USD
 *               provider: paypal
 *               providerPaymentId: 5O190127TN364715T
 *               metadata:
 *                 orderId: ORD-12345
 *               createdAt: '2026-05-31T10:00:00.000Z'
 *               updatedAt: '2026-05-31T10:01:00.000Z'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             status: error
 *             code: NOT_FOUND
 *             message: Transaction not found
 *       401:
 *         description: Invalid or missing API key
 *
 * /api/v1/payments/{id}/refund:
 *   post:
 *     tags: [Payments]
 *     summary: Refund a transaction
 *     description: Refunds a completed transaction fully or partially.
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the transaction to refund
 *         example: d1a2b3c4-5678-90ab-cdef-1234567890ab
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefundInput'
 *           example:
 *             amount: 500
 *             reason: Customer requested partial refund
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefundResponse'
 *           example:
 *             status: success
 *             data:
 *               transactionId: d1a2b3c4-5678-90ab-cdef-1234567890ab
 *               refundId: 5O190127TN364715T
 *               status: REFUNDED
 *               amount: 500
 *       400:
 *         description: Cannot refund (transaction not completed or not found)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid or missing API key
 *
 * /api/v1/payments/callback:
 *   get:
 *     tags: [Payments]
 *     summary: PayPal callback (user redirect)
 *     description: Endpoint that PayPal redirects to after the user approves the payment. Captures the payment and redirects back to the merchant.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: PayPal Order ID
 *         example: 5O190127TN364715T
 *       - in: query
 *         name: PayerID
 *         schema:
 *           type: string
 *         description: PayPal Payer ID
 *     responses:
 *       302:
 *         description: Redirects to the merchant's returnUrl with transactionId and status
 *       400:
 *         description: Missing token
 */
