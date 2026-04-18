import Redis from 'ioredis';

/**
 * Redis connection instance for BullMQ and Caching.
 */
const redisConnection = new Redis({
  // CRITICAL: Uses 'redis_cache' when in Docker, 'localhost' for local dev
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null, // Required by BullMQ
});

export default redisConnection;