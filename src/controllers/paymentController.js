/**
 * @fileoverview Payment Controller.
 * Thin HTTP layer that delegates business logic to transactionService.
 *
 * Endpoints:
 * - POST   /api/v1/payments/create       — Create a payment intent.
 * - GET    /api/v1/payments/:id/status    — Query transaction status.
 * - GET    /api/v1/payments/callback      — PayPal redirect after approval.
 * - GET    /api/v1/methods                — List available providers.
 */

import { transactionService } from "../services/index.js";
import { logger } from "../lib/logger.js";

/**
 * POST /api/v1/payments/create
 * Creates a payment intent with the specified provider.
 *
 * Expects a validated body from createPaymentSchema.
 * Returns the transaction ID, provider payment ID, redirect URL, and status.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const createPayment = async (req, res, next) => {
  try {
    const result = await transactionService.createPayment(req.body);

    return res.status(201).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    logger.error({ error: error.message }, "Error creating payment");
    next(error);
  }
};

/**
 * GET /api/v1/payments/:id/status
 * Returns the current status and details of a transaction.
 *
 * @param {import('express').Request}  req  - `req.params.id` is the transaction UUID.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const result = await transactionService.getPaymentStatus(req.params.id);

    if (!result) {
      return res.status(404).json({
        status: "error",
        code: "NOT_FOUND",
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/methods
 * Lists all registered payment providers and their supported methods.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export const getAvailableMethods = async (req, res) => {
  const providers = transactionService.getAvailableMethods();

  return res.status(200).json({
    status: "success",
    data: providers,
  });
};

/**
 * GET /api/v1/payments/callback
 * PayPal redirect handler. Called when the user approves a payment.
 *
 * PayPal redirects here with `?token=ORDER_ID&PayerID=XXX`.
 * This endpoint captures the payment via PayPal API and updates the transaction.
 * On success, redirects the user to the merchant's returnUrl.
 *
 * @param {import('express').Request}  req  - `req.query.token` is the PayPal Order ID.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const handleCallback = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ status: "error", message: "Missing token" });
    }

    const result = await transactionService.captureByOrderId(token);

    const transaction = result.transaction;
    const merchantReturnUrl = transaction.metadata?.returnUrl || process.env.BASE_URL;

    return res.redirect(
      `${merchantReturnUrl}?transactionId=${transaction.id}&status=${transaction.status}`
    );
  } catch (error) {
    logger.error({ error: error.message }, "Error in PayPal callback");
    next(error);
  }
};

/**
 * GET /api/v1/payments/callback?cancelled=true
 * PayPal cancel handler. Called when the user cancels the payment.
 *
 * Marks the transaction as FAILED and redirects the user.
 *
 * @param {import('express').Request}  req  - `req.query.token` is the PayPal Order ID.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const handleCancel = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (token) {
      await transactionService.cancelByOrderId(token);
    }

    return res.redirect(process.env.BASE_URL || "http://localhost:3000");
  } catch (error) {
    logger.error({ error: error.message }, "Error in PayPal cancel callback");
    next(error);
  }
};