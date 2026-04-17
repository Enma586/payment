/**
 * @fileoverview Workers Barrel File.
 * Centralizes the initialization of all background job processors.
 */

import paymentWorker from './paymentWorker.js';

/**
 * We export the workers in case we need to manage their lifecycle 
 * (e.g., graceful shutdown) from the main server file.
 */
export {
  paymentWorker
};