import { Sequelize } from 'sequelize';

/**
 * Database instance configuration.
 * Uses environment variables provided by Docker or .env file.
 */
const sequelize = new Sequelize(
  process.env.DB_NAME || 'payment_gateway_db',
  process.env.DB_USER || 'user_dev',
  process.env.DB_PASSWORD || 'password_dev',
  {
    // CRITICAL: Uses 'postgres_db' when in Docker, 'localhost' for local dev
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
  }
);

export default sequelize;