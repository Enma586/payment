/**
 * @openapi
 * /api/v1/methods:
 *   get:
 *     tags: [Methods]
 *     summary: Listar proveedores de pago disponibles
 *     description: Retorna todos los proveedores de pago registrados y sus métodos soportados.
 *     responses:
 *       200:
 *         description: Lista de proveedores y métodos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       provider:
 *                         type: string
 *                         example: stripe
 *                       methods:
 *                         type: array
 *                         items:
 *                           type: string
 *                           example: card
 */
