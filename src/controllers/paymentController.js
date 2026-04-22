/**
 * @fileoverview Payment Controller.
 * Thin HTTP layer that delegates business logic to transactionService.
 */

import { transactionService } from '../services/index.js';
import { logger } from '../lib/logger.js';

/**
 * POST /api/v1/payments/create
 */
export const createPayment = async (req, res, next) => {
  try {
    const result = await transactionService.createPayment(req.body);

    return res.status(201).json({
      status: 'success',
      data: result,
    });

  } catch (error) {
    logger.error({ error: error.message }, 'Error creating payment');
    next(error);
  }
};

/**
 * GET /api/v1/payments/:id/status
 */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const result = await transactionService.getPaymentStatus(req.params.id);

    if (!result) {
      return res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'Transaction not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: result,
    });

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/methods
 */
export const getAvailableMethods = async (req, res) => {
  const providers = transactionService.getAvailableMethods();

  return res.status(200).json({
    status: 'success',
    data: providers,
  });
};