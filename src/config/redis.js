/**
 * @fileoverview Redis connection configuration using ioredis.
 * Optimized for BullMQ background job processing.
 */

const Redis = require('ioredis');

/**
 * ioredis configuration object.
 * @type {Object}
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  /**
   * BullMQ requires maxRetriesPerRequest to be null to handle
   * retries at the application level rather than the driver level.
   */
  maxRetriesPerRequest: null,
};

/**
 * Singleton instance of the Redis connection.
 * @type {import('ioredis').Redis}
 */
const redisConnection = new Redis(redisConfig);

module.exports = redisConnection;