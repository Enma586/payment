/**
 * @fileoverview Background Worker to process payment notifications.
 * It listens to the 'payment-notifications' queue.
 */

import { Worker } from 'bullmq';
import { redisConnection } from '../config/index.js';
import { Transaction } from '../models/index.js';
import { logger } from '../lib/logger.js';

/**
 * Initializes the Worker to process jobs from Redis.
 */
const paymentWorker = new Worker('payment-notifications', async (job) => {
  const { transactionId } = job.data;
  
  logger.info(`Worker processing job ${job.id} for Transaction: ${transactionId}`);

  try {
    // 1. Fetch the latest data from PostgreSQL
    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found in database.`);
    }

    // 2. Business Logic: Here you would send a Webhook or Email to the client
    logger.info(`Sending notification for status: ${transaction.status}...`);
    
    // Simulate an external API call (e.g., Axios request to the client's URL)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Update status to COMPLETED if everything went well
    await transaction.update({ status: 'COMPLETED' });
    
    logger.info(`Transaction ${transactionId} successfully notified and updated.`);
    
  } catch (error) {
    logger.error(`Worker failed for job ${job.id}: ${error.message}`);
    
    // Update status to RETRYING or FAILED based on the error
    const transaction = await Transaction.findByPk(transactionId);
    if (transaction) {
      await transaction.update({ 
        status: 'RETRYING',
        errorLog: error.message 
      });
    }

    // Re-throwing the error tells BullMQ to use the backoff/retry strategy
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 5 // Process up to 5 jobs simultaneously
});

// Event listeners for monitoring
paymentWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} has been completed!`);
});

paymentWorker.on('failed', async (job, err) => {
  logger.error(`Job ${job.id} has failed with ${err.message}`);

  if (job && job.attemptsMade >= (job.opts?.attempts || 5)) {
    const tx = await Transaction.findByPk(job.data.transactionId);
    if (tx) {
      await tx.update({ status: 'FAILED', errorLog: err.message });
      logger.info(`Transaction ${tx.id} marked as FAILED after all retries exhausted.`);
    }
  }
});

export default paymentWorker;