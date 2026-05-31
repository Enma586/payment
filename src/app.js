/**
 * @fileoverview Express application configuration using ES Modules.
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/index.js';
import apiRouter from './routes/index.js';
import { swaggerSpec } from './swagger/index.js';
import { sequelize, redisConnection } from './config/index.js';
const app = express();
app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
  methods: ['GET', 'POST']
}));

// JSON parser with raw body capture for webhook signature verification
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf.toString();
  }
}));

// Swagger API Documentation
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.get('/api-docs', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Payment Gateway API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api-docs.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
    });
  </script>
</body>
</html>`);
});

// Rate limiter for webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  message: { status: 'error', code: 'RATE_LIMITED', message: 'Too many requests' }
});

app.use('/api/v1/payments/webhook', webhookLimiter);
app.use('/api/v1/webhooks/', webhookLimiter);

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