/**
 * @fileoverview Transaction model definition using Sequelize.
 * Stores all payment attempts and their current lifecycle status.
 */

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  externalId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'ID provided by the payment gateway (e.g., Stripe ch_...)',
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Amount in cents to avoid floating point issues',
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  },
  status: {
    type: DataTypes.ENUM('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING'),
    defaultValue: 'RECEIVED',
  },
  idempotencyKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Key to prevent duplicate processing of the same event',
  },
  rawResponse: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Full JSON payload from the provider for audit purposes',
  },
  errorLog: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Details about the failure if status is FAILED',
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Payment provider name: paypal, stripe, etc.',
  },
  providerPaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID of the payment in the provider system',
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Method used: card, paypal, pix, etc.',
  },
  webhookUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Client URL to send payment status notifications to',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Extra data: returnUrl, cancelUrl, clientReference, etc.',
  }
}, {
  timestamps: true,
  tableName: 'transactions',
});

export default Transaction;