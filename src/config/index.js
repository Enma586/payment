/**
 * @fileoverview Configuration Barrel File.
 * Centralizes and exports all infrastructure connection instances.
 */

const sequelize = require('./database');
const redisConnection = require('./redis');

/**
 * Exported configuration objects for the entire application.
 * Provides access to PostgreSQL (sequelize) and Redis (redisConnection).
 */
module.exports = {
  sequelize,
  redisConnection
};