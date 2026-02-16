import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Campaigns", "customVariables", {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn("Campaigns", "variablesData", {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    });

    return Promise.resolve();
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Campaigns", "customVariables");
    await queryInterface.removeColumn("Campaigns", "variablesData");
    
    return Promise.resolve();
  }
};

