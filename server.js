/**
 * @fileoverview Main entry point for the Payment Gateway.
 * Orchestrates infrastructure connections, starts workers, and the HTTP server.
 */

import 'dotenv/config'; // Loads .env into process.env at the very start
import app from './src/app.js';
import { sequelize, redisConnection } from './src/config/index.js';
import { logger } from './src/lib/logger.js';

/** * --- Background Workers ---
 * Importing the workers' index initializes the BullMQ listeners.
 * This is crucial for processing tasks in the background.
 */
import './src/workers/index.js'; 

const PORT = process.env.PORT || 3000;

/**
 * Bootstrap function to handle asynchronous initialization.
 */
async function startServer() {
  try {
    logger.info('Starting server bootstrap process...');

    // 1. Verify Database Connection (PostgreSQL in Docker)
    await sequelize.authenticate();
    // sync({ force: false }) creates tables if they don't exist
    await sequelize.sync({ force: false });
    logger.info('DB CONNECTED');

    // 2. Verify Redis Connection (For BullMQ and Caching)
    await redisConnection.ping();
    logger.info('REDIS CONNECTED');

    // 3. Start Express Server
    app.listen(PORT, () => {
      logger.info(`SERVER RUNNING AT http://localhost:${PORT}`);
    });

  } catch (error) {
    logger.error('ERROR DURING SERVER BOOTSTRAP:');
    logger.error(error.message);
    
    // In production, we want the container to restart if it fails to connect
    process.exit(1);
  }
}

// Global handler for unhandled promise rejections (Good engineering practice)
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

/**
 * Graceful Shutdown handler.
 * Ensures that DB and Redis connections are closed cleanly.
 */
const gracefulShutdown = async (signal) => {
  logger.info(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  try {
    // 1. Aquí podrías cerrar el worker si lo exportaras
    // await paymentWorker.close(); 
    
    await sequelize.close();
    logger.info('PostgreSQL connection closed.');
    
    await redisConnection.quit();
    logger.info('Redis connection closed.');
    
    logger.info('Shutdown complete. Goodbye!');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));