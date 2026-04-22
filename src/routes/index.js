/**
 * @fileoverview Main Router Barrel File.
 * Centralizes all API route modules.
 */

import { Router } from 'express';
import paymentRoutes from './paymentRoutes.js';
import second from './methodRoutes.js'

const router = Router();

/**
 * Prefixing all payment routes with /payments
 */
router.use('/payments', paymentRoutes);

export default router;                                                                                                                                                                                                                                    