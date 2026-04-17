/**
 * @fileoverview Webhook Controller.
 * Handles incoming HTTP requests from the payment provider.
 */

import { paymentService } from '../services/index.js';
import { logger } from '../lib/logger.js';

/**
 * Handles the payment provider's webhook POST request.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const { externalId } = req.body;
    logger.info(`Processing incoming webhook for External ID: ${externalId}`);

    // Business logic is encapsulated in the service
    const transaction = await paymentService.processWebhook(req.body);

    // Standard response for payment gateways (they expect 2xx quickly)
    return res.status(201).json({
      status: 'success',
      message: 'Webhook processed successfully',
      data: {
        id: transaction.id,
        status: transaction.status
      }
    });
  } catch (error) {
    // We pass any error to the global errorHandler middleware
    logger.error(`Controller Error: ${error.message}`);
    next(error);
  }
};