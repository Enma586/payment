/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Verificar estado del servicio
 *     description: Health check que verifica la conectividad con PostgreSQL y Redis.
 *     responses:
 *       200:
 *         description: Servicio saludable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Servicio no disponible (DB o Redis caído)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: DOWN
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
