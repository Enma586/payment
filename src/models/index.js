/**
 * @fileoverview Models Barrel File.
 * Centralizes all models and handles database synchronization and associations.
 */

import sequelize from '../config/database.js';
import Transaction from './Transaction.js';

/**
 * Object containing all initialized models.
 */
const models = {
  Transaction,
};

// If we had associations, we would initialize them here:
// Object.keys(models).forEach((modelName) => {
//   if (models[modelName].associate) {
//     models[modelName].associate(models);
//   }
// });

export {
  ...models,
  sequelize, // Exporting sequelize to handle transactions or sync if needed
};