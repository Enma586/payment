/**
 * @fileoverview Configuration Barrel File.
 * Centralizes and exports all infrastructure connection instances.
 */

import sequelize from './database.js';
import redisConnection from './redis.js';

/**
 * Exported configuration objects for the entire application.
 * Provides access to PostgreSQL (sequelize) and Redis (redisConnection).
 */
export {
  sequelize,
  redisConnection
};