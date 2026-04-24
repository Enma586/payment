import { transactionService } from "../services/index.js";
import { logger } from "../lib/logger.js";

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

export const getAvailableMethods = async (req, res) => {
  const providers = transactionService.getAvailableMethods();

  return res.status(200).json({
    status: "success",
    data: providers,
  });
};

export const handleCallback = async (req, res, next) => {
  try {
    const { token, PayerID } = req.query;

    if (!token) {
      return res.status(400).json({ status: "error", message: "Missing token" });
    }

    const result = await transactionService.captureByOrderId(token);

    // Redirect to the merchant's returnUrl stored in metadata
    const transaction = result.transaction;
    const merchantReturnUrl = transaction.metadata?.returnUrl || process.env.BASE_URL;

    return res.redirect(`${merchantReturnUrl}?transactionId=${transaction.id}&status=${transaction.status}`);
  } catch (error) {
    logger.error({ error: error.message }, "Error in PayPal callback");
    next(error);
  }
};

export const handleCancel = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (token) {
      await transactionService.cancelByOrderId(token);
    }

    return res.redirect(req.query.cancelled ? process.env.BASE_URL : process.env.BASE_URL);
  } catch (error) {
    logger.error({ error: error.message }, "Error in PayPal cancel callback");
    next(error);
  }
};