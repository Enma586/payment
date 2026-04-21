/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('transactions', {
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
      type: Sequelize.INTEGER,
      allowNull: false
    },
    currency: {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'USD'
    },
    status: {
      type: Sequelize.ENUM('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING'),
      defaultValue: 'RECEIVED'
    },
    idempotencyKey: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    rawResponse: {
      type: Sequelize.JSONB,
      allowNull: true
    },
    errorLog: {
      type: Sequelize.TEXT,
      allowNull: true
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
  await queryInterface.dropTable('transactions');
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_transactions_status";'
  );
};
