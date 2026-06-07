/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     description: Health check endpoint that verifies PostgreSQL and Redis connectivity.
 *     responses:
 *       200:
 *         description: Service is healthy
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
 *             example:
 *               status: UP
 *               timestamp: '2026-05-31T10:00:00.000Z'
 *       503:
 *         description: Service unavailable (DB or Redis down)
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
 *             example:
 *               status: DOWN
 *               timestamp: '2026-05-31T10:00:00.000Z'
 */
