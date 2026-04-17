/**
 * @fileoverview Models Barrel File.
 * Centralizes all models and exports the sequelize instance.
 */

import sequelize from '../config/database.js';
import Transaction from './Transaction.js';

/**
 * We export the models individually for better IDE support (IntelliSense)
 * and the sequelize instance for migrations or manual queries.
 */
export {
  Transaction,
  sequelize
};