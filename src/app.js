/**
 * @fileoverview Express application configuration using ES Modules.
 */

import express from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/index.js';
// import paymentRoutes from './routes/paymentRoutes.js'; // Lo crearemos pronto

const app = express();

/**
 * Global Middlewares
 */
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Essential for parsing webhook JSON payloads

/**
 * Health Check Route
 * Useful for Docker and Load Balancers to verify the service is alive.
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

/**
 * API Routes
 */
// app.use('/api/v1/payments', paymentRoutes);

/**
 * Global Error Handling
 * Important: This must be the last middleware attached to the app.
 */
app.use(errorHandler);

export default app;