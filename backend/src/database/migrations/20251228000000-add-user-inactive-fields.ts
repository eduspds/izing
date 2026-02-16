import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Users", "isInactive", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }),
      queryInterface.addColumn("Users", "inactiveUntil", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      }),
      queryInterface.addColumn("Users", "inactiveReason", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Users", "isInactive"),
      queryInterface.removeColumn("Users", "inactiveUntil"),
      queryInterface.removeColumn("Users", "inactiveReason")
    ]);
  }
};








