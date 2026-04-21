import { Router } from 'express';
import { webhookController } from '../controllers/index.js';
import { verifySignature, validateSchema } from '../middlewares/index.js';
import { paymentSchema } from '../schemas/index.js';

const router = Router();

router.post(
  '/webhook',
  verifySignature,
  validateSchema(paymentSchema),
  webhookController.handleWebhook
);

export default router;
