import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("InternalGroups", "department", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("InternalGroups", "allowedProfile", {
        type: DataTypes.STRING,
        allowNull: true
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("InternalGroups", "department"),
      queryInterface.removeColumn("InternalGroups", "allowedProfile")
    ]);
  }
};
