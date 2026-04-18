// migrations/20260418-create-transactions.js

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('Transactions', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4
    },
    externalId: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED'),
      defaultValue: 'RECEIVED'
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn('now')
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn('now')
    }
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('Transactions');
};