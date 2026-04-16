/**
 * @fileoverview Main entry point for the Payment Gateway.
 * Orchestrates infrastructure connections and starts the HTTP server.
 */

import 'dotenv/config'; // Loads .env into process.env at the very start
import app from './src/app.js';
import { sequelize, redisConnection } from './src/config/index.js';
import { logger } from './src/lib/logger.js';

const PORT = process.env.PORT || 3000;

/**
 * Bootstrap function to handle asynchronous initialization.
 */
async function startServer() {
  try {
    logger.info('Starting server bootstrap process...');

    // 1. Verify Database Connection (PostgreSQL in Docker)
    await sequelize.authenticate();
    // sync({ force: false }) creates tables if they don't exist without deleting data
    await sequelize.sync({ force: false });
    logger.info('Database connected and models synced.');

    // 2. Verify Redis Connection (For BullMQ)
    await redisConnection.ping();
    logger.info('Redis connection established.');

    // 3. Start Express Server
    app.listen(PORT, () => {
      logger.info(`Payment Gateway running at http://localhost:${PORT}`);
      logger.info(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    logger.error('Critical failure during bootstrap:');
    logger.error(error.message);
    
    // In production, we want the container to restart if it fails to connect
    process.exit(1);
  }
}

// Global handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();