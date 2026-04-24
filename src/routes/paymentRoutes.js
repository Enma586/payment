import { Router } from "express";
import { paymentController, webhookController } from "../controllers/index.js";
import { verifyApiKey, verifySignature, validateSchema } from "../middlewares/index.js";
import createPaymentSchema from "../schemas/createPaymentSchema.js";
import paymentSchema from "../schemas/paymentSchema.js";
import refundSchema from "../schemas/refundSchema.js";

const router = Router();

router.post(
  "/create",
  verifyApiKey,
  validateSchema(createPaymentSchema),
  paymentController.createPayment,
);

router.get(
  "/:id/status",
  verifyApiKey,
  paymentController.getPaymentStatus,
);

router.post(
  "/:id/refund",
  verifyApiKey,
  validateSchema(refundSchema),
  paymentController.refundPayment,
);

router.get(
  "/callback",
  paymentController.handleCallback,
);

router.post(
  "/webhook",
  verifySignature,
  validateSchema(paymentSchema),
  webhookController.handleWebhook,
);

export default router;