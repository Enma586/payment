/**
 * @fileoverview Redis connection instance for BullMQ and caching.
 *
 * Configuration:
 *   - Uses REDIS_HOST, REDIS_PORT, REDIS_PASSWORD from environment.
 *   - If REDIS_PASSWORD is not set, connects without authentication (dev mode).
 *   - maxRetriesPerRequest is set to null as required by BullMQ.
 *
 * Docker:
 *   - Development: redis_cache without password.
 *   - Production: redis_cache with --requirepass (password from REDIS_PASSWORD).
 */

import Redis from 'ioredis';

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
});

export default redisConnection;