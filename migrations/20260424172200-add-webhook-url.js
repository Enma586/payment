/**
 * @fileoverview Migration to add webhookUrl column to transactions table.
 * This column stores the client's URL to receive payment status notifications.
 */

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('transactions', 'webhookUrl', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Client URL to send payment status notifications to',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn('transactions', 'webhookUrl');
};