/**
 * @fileoverview Database connection configuration using Sequelize ORM.
 * This module initializes the PostgreSQL connection pool.
 */

import { Sequelize } from 'sequelize';

/**
 * Sequelize instance configured for PostgreSQL.
 * It uses the DATABASE_URL provided in the environment variables.
 * * @type {import('sequelize').Sequelize}
 */
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // Set to console.log to see raw SQL queries in development
  pool: {
    max: 5,        // Maximum number of connections in pool
    min: 0,        // Minimum number of connections in pool
    acquire: 30000, // Maximum time (ms) that pool will try to get connection before throwing error
    idle: 10000    // Maximum time (ms) that a connection can be idle before being released
  }
});

export default sequelize;