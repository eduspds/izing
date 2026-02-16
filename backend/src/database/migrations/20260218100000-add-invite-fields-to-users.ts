import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Users", "resetPasswordToken", {
        type: DataTypes.STRING,
        allowNull: true
      }),
      queryInterface.addColumn("Users", "resetPasswordExpires", {
        type: DataTypes.DATE,
        allowNull: true
      }),
      queryInterface.addColumn("Users", "accountStatus", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "ACTIVE"
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Users", "resetPasswordToken"),
      queryInterface.removeColumn("Users", "resetPasswordExpires"),
      queryInterface.removeColumn("Users", "accountStatus")
    ]);
  }
};
