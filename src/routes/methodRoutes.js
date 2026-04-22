/**
 * @fileoverview Method Routes.
 * Returns available payment providers and their supported methods.
 */

import { Router } from 'express';
import { paymentController } from '../controllers/index.js';

const router = Router();

/**
 * GET /api/v1/methods
 */
router.get('/', paymentController.getAvailableMethods);

export default router;