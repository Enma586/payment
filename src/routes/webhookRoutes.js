/**
 * @fileoverview Webhook Routes.
 * Dynamic webhook handler that routes to the correct provider.
 */

import { Router } from 'express';
import { webhookController } from '../controllers/index.js';

const router = Router();

/**
 * POST /api/v1/webhooks/:provider
 * Each provider verifies its own signature internally.
 */
router.post('/:provider', webhookController.handleProviderWebhook);

export default router;