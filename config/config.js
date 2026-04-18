import 'dotenv/config';

/**
 * Sequelize Configuration File
 * Using ES Modules and Environment Variables for 2026 Standards.
 */
const config = {
  development: {
    username: process.env.DB_USER || 'user_dev',
    password: process.env.DB_PASSWORD || 'password_dev',
    database: process.env.DB_NAME || 'payment_gateway_db',
    host: process.env.DB_HOST || 'postgres_db',
    dialect: 'postgres',
    logging: true
  },
  test: {
    username: process.env.DB_USER || 'user_dev',
    password: process.env.DB_PASSWORD || 'password_dev',
    database: 'payment_gateway_test',
    host: process.env.DB_HOST || 'postgres_db',
    dialect: 'postgres',
    logging: false
  },
  production: {
    // In production, we always prioritize the full connection string (e.g., Railway/Heroku/AWS)
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

export default config;