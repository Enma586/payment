/**
 * @fileoverview Main Router Barrel File.
 * Centralizes all API route modules.
 */

import { Router } from 'express';
import paymentRoutes from './paymentRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import methodRoutes from './methodRoutes.js';

const router = Router();

router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/methods', methodRoutes);

export default router;