import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "isEvaluationFlow", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn("Tickets", "evaluationStartedAt", {
      type: DataTypes.BIGINT,
      allowNull: true,
      defaultValue: null
    });

    return Promise.resolve();
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "isEvaluationFlow");
    await queryInterface.removeColumn("Tickets", "evaluationStartedAt");
    
    return Promise.resolve();
  }
};

