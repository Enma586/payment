/**
 * @openapi
 * /api/v1/methods:
 *   get:
 *     tags: [Methods]
 *     summary: List available payment providers
 *     description: Returns all registered payment providers and their supported methods.
 *     responses:
 *       200:
 *         description: List of providers and methods
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
 *                         example: paypal
 *                       methods:
 *                         type: array
 *                         items:
 *                           type: string
 *                           example: paypal
 *             example:
 *               status: success
 *               data:
 *                 - provider: paypal
 *                   methods:
 *                     - paypal
 *                     - card
 */
