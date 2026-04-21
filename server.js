/**
 * @fileoverview Main entry point for the Payment Gateway.
 * Updated to support Sequelize Migrations and Production standards.
 */

import 'dotenv/config'; 
import app from './src/app.js';
import { sequelize, redisConnection } from './src/config/index.js';
import { logger } from './src/lib/logger.js';
import { paymentWorker } from './src/workers/index.js'; 

const PORT = process.env.PORT || 3000;

const REQUIRED_ENV_VARS = ['WEBHOOK_SECRET'];
const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingVars.length) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

/**
 * Bootstrap function to handle asynchronous initialization.
 */
async function startServer() {
  try {
    logger.info('Starting server bootstrap process...');

    // 1. Verify Database Connection
    // We only AUTHENTICATE. We no longer use .sync() because 
    // migrations handle the schema versioning.
    await sequelize.authenticate();
    logger.info('DB CONNECTION ESTABLISHED (PostgreSQL)');

    // 2. Verify Redis Connection
    await redisConnection.ping();
    logger.info('REDIS CONNECTION ESTABLISHED');

    // 3. Start Express Server
    app.listen(PORT, () => {
      logger.info(`SERVER RUNNING AT http://localhost:${PORT}`);
      logger.info('Press Ctrl+C to stop');
    });

  } catch (error) {
    logger.error(error, 'CRITICAL ERROR DURING SERVER BOOTSTRAP');
    process.exit(1);
  }
}

// Global handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ promise }, `Unhandled Rejection: ${reason}`);
});

startServer();

/**
 * Graceful Shutdown handler.
 */
const gracefulShutdown = async (signal) => {
  logger.info(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  try {
    await paymentWorker.close();
    logger.info('BullMQ worker closed.');

    await sequelize.close();
    logger.info('PostgreSQL connection closed.');
    
    await redisConnection.quit();
    logger.info('Redis connection closed.');
    
    logger.info('Shutdown complete. Goodbye!');
    process.exit(0);
  } catch (err) {
    logger.error(err, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));