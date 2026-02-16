import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE "TicketKanbans" ALTER COLUMN "ticketId" DROP NOT NULL;'
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE "TicketKanbans" ALTER COLUMN "ticketId" SET NOT NULL;'
    );
  }
};
