import { Sequelize } from 'sequelize';
import { Transaction } from '../src/models/index.js';

const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    username: process.env.DB_USER || 'user_dev',
    password: process.env.DB_PASSWORD || 'password_dev',
    database: process.env.DB_NAME || 'payment_gateway_db',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: true
  },
  test: {
    username: process.env.DB_USER || 'user_dev',
    password: process.env.DB_PASSWORD || 'password_dev',
    database: process.env.DB_NAME || 'payment_gateway_test',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false
  },
  production: {
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

const envConfig = config[env];
let sequelize;

if (envConfig.use_env_variable) {
  sequelize = new Sequelize(process.env[envConfig.use_env_variable], envConfig);
} else {
  sequelize = new Sequelize(
    envConfig.database,
    envConfig.username,
    envConfig.password,
    envConfig
  );
}

const db = {
  Transaction,
  sequelize,
  Sequelize
};

export default db;
