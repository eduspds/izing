import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn("TicketKanbans", "ticketId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Tickets", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn("TicketKanbans", "ticketId", {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Tickets", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    });
  }
};
