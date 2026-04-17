/**
 * @fileoverview Main Router Barrel File.
 * Centralizes all API route modules.
 */

import { Router } from 'express';
import paymentRoutes from './payment.Routes.js';

const router = Router();

/**
 * Prefixing all payment routes with /payments
 */
router.use('/payments', paymentRoutes);

export default router;                                                                                                                                                                                                                                    