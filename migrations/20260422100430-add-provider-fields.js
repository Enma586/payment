/**
 * @fileoverview Migration to add provider-related fields to transactions table.
 * Adds: provider, providerPaymentId, paymentMethod, metadata.
 */

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('transactions', 'provider', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Payment provider name: paypal, stripe, etc.',
  });

  await queryInterface.addColumn('transactions', 'providerPaymentId', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'ID of the payment in the provider system',
  });

  await queryInterface.addColumn('transactions', 'paymentMethod', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Method used: card, paypal, pix, etc.',
  });

  await queryInterface.addColumn('transactions', 'metadata', {
    type: Sequelize.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Extra data: returnUrl, cancelUrl, clientReference, etc.',
  });

  await queryInterface.addIndex('transactions', ['provider']);
  await queryInterface.addIndex('transactions', ['providerPaymentId']);
};

export const down = async (queryInterface) => {
  await queryInterface.removeIndex('transactions', ['providerPaymentId']);
  await queryInterface.removeIndex('transactions', ['provider']);
  await queryInterface.removeColumn('transactions', 'metadata');
  await queryInterface.removeColumn('transactions', 'paymentMethod');
  await queryInterface.removeColumn('transactions', 'providerPaymentId');
  await queryInterface.removeColumn('transactions', 'provider');
};