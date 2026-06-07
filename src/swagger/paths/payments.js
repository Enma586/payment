/**
 * @openapi
 * /api/v1/payments/create:
 *   post:
 *     tags: [Payments]
 *     summary: Crear una intención de pago
 *     description: |
 *       Crea un pago con el proveedor especificado. Retorna URL de redirección para el cliente.
 *
 *       **Cómo completar el pago:**
 *       1. Crea el pago aquí — recibirás un `transactionId` y un `redirectUrl`
 *       2. Abre el `redirectUrl` en un navegador
 *       3. Inicia sesión en PayPal (sandbox) y aprueba el pago
 *       4. PayPal te redirige automáticamente y la transacción pasa a `COMPLETED`
 *       5. Consulta el estado con `GET /api/v1/payments/{id}/status`
 *
 *       **Cuenta sandbox para pruebas:**
 *       - Correo: `sb-xxxxx@personal.example.com`
 *       - Contraseña: `12345678`
 *       *(crea tu propia cuenta en https://developer.paypal.com/dashboard/accounts)*
 *
 *       **Idempotencia:** Si envías el mismo `idempotencyKey` en otra petición, no se crea un duplicado.
 *       En su lugar, retorna la transacción existente con status `200` en vez de `201`.
 *       Esto es útil para reintentar sin riesgo de cobrar dos veces.
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
 *             returnUrl: https://micomercio.com/success
 *             cancelUrl: https://micomercio.com/cancel
 *             webhookUrl: https://micomercio.com/webhooks/pagos
 *             idempotencyKey: pago-cliente-abc-001
 *             metadata:
 *               orderId: ORD-12345
 *     responses:
 *       201:
 *         description: Pago creado exitosamente (nueva transacción)
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
 *         description: Transacción existente (mismo idempotencyKey — no se cobró de nuevo)
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
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: API key inválida o faltante
 *
 * /api/v1/payments/{id}/status:
 *   get:
 *     tags: [Payments]
 *     summary: Consultar estado de una transacción
 *     description: |
 *       Retorna el estado actual y detalles de una transacción por su UUID.
 *
 *       **Estados posibles:** `RECEIVED` → `PROCESSING` → `COMPLETED` / `FAILED` / `REFUNDED`
 *       - Usa el `transactionId` que recibiste al crear el pago.
 *       - Una vez que PayPal completa el pago y envía el webhook, el estado cambia a `COMPLETED`.
 *       - Si el pago fue reembolsado, el estado cambia a `REFUNDED`.
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la transacción
 *         example: d1a2b3c4-5678-90ab-cdef-1234567890ab
 *     responses:
 *       200:
 *         description: Estado de la transacción
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
 *         description: Transacción no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             status: error
 *             code: NOT_FOUND
 *             message: Transaction not found
 *       401:
 *         description: API key inválida o faltante
 *
 * /api/v1/payments/{id}/refund:
 *   post:
 *     tags: [Payments]
 *     summary: Reembolsar una transacción
 *     description: Reembolsa total o parcialmente una transacción completada.
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la transacción a reembolsar
 *         example: d1a2b3c4-5678-90ab-cdef-1234567890ab
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefundInput'
 *           example:
 *             amount: 500
 *             reason: Cliente solicita reembolso parcial
 *     responses:
 *       200:
 *         description: Reembolso procesado exitosamente
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
 *         description: No se puede reembolsar (transacción no completada o no encontrada)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: API key inválida o faltante
 *
 * /api/v1/payments/callback:
 *   get:
 *     tags: [Payments]
 *     summary: Callback de PayPal (redirección del usuario)
 *     description: Endpoint al que PayPal redirige al usuario después de aprobar el pago. Captura el pago y redirige al comercio.
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
 *         description: ID del pagador en PayPal
 *     responses:
 *       302:
 *         description: Redirecciona al returnUrl del comercio con transactionId y status
 *       400:
 *         description: Token faltante
 */
