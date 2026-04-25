/**
 * @fileoverview Migration to add REFUNDED status to the transactions status ENUM.
 */

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface) => {
  await queryInterface.sequelize.query(
    "ALTER TYPE enum_transactions_status ADD VALUE 'REFUNDED'"
  );
};

export const down = async (queryInterface) => {
  // PostgreSQL no soporta REMOVE VALUE en ENUMs.
  // Para revertir, habría que recrear el tipo ENUM.
  // En producción, simplemente no se revierte.
  await queryInterface.sequelize.query(
    `DELETE FROM pg_enum 
     WHERE enumtypid = (
       SELECT oid FROM pg_type WHERE typname = 'enum_transactions_status'
     ) AND enumlabel = 'REFUNDED'`
  );
};