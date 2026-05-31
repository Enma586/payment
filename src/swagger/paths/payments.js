/**
 * @openapi
 * /api/v1/payments/create:
 *   post:
 *     tags: [Payments]
 *     summary: Crear una intención de pago
 *     description: Crea un pago con el proveedor especificado. Retorna URL de redirección para el cliente.
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentInput'
 *     responses:
 *       201:
 *         description: Pago creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
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
 *     description: Retorna el estado actual y detalles de una transacción por su UUID.
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
 *       404:
 *         description: Transacción no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefundInput'
 *     responses:
 *       200:
 *         description: Reembolso procesado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefundResponse'
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
