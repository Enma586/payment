/**
 * @fileoverview Express application configuration using ES Modules.
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/index.js';
import apiRouter from './routes/index.js';
import { sequelize, redisConnection } from './config/index.js';
const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Rate limiter for webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  message: { status: 'error', code: 'RATE_LIMITED', message: 'Too many requests' }
});

// Raw body capture for legacy webhook
app.use('/api/v1/payments/webhook', webhookLimiter);
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body.toString();
  req.body = JSON.parse(req.rawBody);
  next();
});

// Raw body capture for dynamic provider webhooks
app.use('/api/v1/webhooks/', webhookLimiter);
app.use('/api/v1/webhooks/', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body.toString();
  req.body = JSON.parse(req.rawBody);
  next();
});

/**
 * Health Check Route
 */
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    await redisConnection.ping();
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'DOWN', timestamp: new Date().toISOString() });
  }
});

/**
 * API Routes
 */
app.use('/api/v1', apiRouter);

/**
 * Global Error Handling
 */
app.use(errorHandler);

export default app;