import { Sequelize } from 'sequelize';

const sslOptions = process.env.DATABASE_URL
  ? {
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    }
  : {};

const sequelize = new Sequelize(
  process.env.DATABASE_URL ||
    `postgres://${process.env.DB_USER || 'user_dev'}:${process.env.DB_PASSWORD || 'password_dev'}@${process.env.DB_HOST || 'localhost'}:5432/${process.env.DB_NAME || 'payment_gateway_db'}`,
  {
    dialect: 'postgres',
    logging: false,
    ...sslOptions,
  }
);

export default sequelize;
