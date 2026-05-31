/**
 * @openapi
 * /api/v1/webhooks/{provider}:
 *   post:
 *     tags: [Webhooks]
 *     summary: Recibir webhook de un proveedor de pagos
 *     description: Endpoint dinámico que recibe webhooks de proveedores (stripe, paypal). Cada proveedor verifica su propia firma internamente.
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [paypal]
 *         description: Nombre del proveedor de pagos
 *         example: paypal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload del webhook (varía según el proveedor)
 *     responses:
 *       200:
 *         description: Webhook procesado exitosamente
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
 *         description: Firma del webhook inválida
 *
 * /api/v1/payments/webhook:
 *   post:
 *     tags: [Webhooks]
 *     summary: Webhook legacy (compatibilidad hacia atrás)
 *     description: Endpoint de webhook con validación de firma compartida. Procesa notificaciones de pago externas.
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
 *                 description: ID externo de la transacción
 *                 example: tx_abc123
 *               amount:
 *                 type: integer
 *                 description: Monto en centavos
 *                 example: 1000
 *               currency:
 *                 type: string
 *                 description: Código ISO 4217
 *                 example: USD
 *               idempotencyKey:
 *                 type: string
 *                 description: Clave de idempotencia
 *               rawResponse:
 *                 type: object
 *                 description: Datos adicionales del webhook
 *           example:
 *             externalId: ext-pago-999
 *             amount: 2500
 *             currency: USD
 *             idempotencyKey: webhook-unicov3-001
 *             rawResponse:
 *               source: sistema-externo
 *               reference: INV-2026-001
 *     responses:
 *       201:
 *         description: Webhook procesado exitosamente
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
 *         description: Firma inválida
 */
