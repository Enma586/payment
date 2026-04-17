/**
 * @fileoverview Queue Service for background job orchestration using BullMQ.
 */

import { Queue } from 'bullmq';
import { redisConnection } from '../config/index.js';
import { logger } from '../lib/logger.js';

// Initialize the queue
const paymentQueue = new Queue('payment-notifications', {
  connection: redisConnection
});

/**
 * Adds a transaction ID to the processing queue.
 * @param {string} transactionId - Internal UUID of the transaction.
 */
export const addPaymentToQueue = async (transactionId) => {
  try {
    const job = await paymentQueue.add('process-notification', 
      { transactionId },
      {
        attempts: 5, // Retry up to 5 times
        backoff: {
          type: 'exponential',
          delay: 10000, // Wait 10s, then 20s, 40s, etc.
        },
        removeOnComplete: true, // Clean up Redis after success
      }
    );

    logger.info(`Job enqueued: ${job.id} for transaction: ${transactionId}`);
    return job;
  } catch (error) {
    logger.error(`Queue Service Error: ${error.message}`);
    throw error;
  }
};

// Export as an object for the barrel file
export const queueService = {
  addPaymentToQueue
};