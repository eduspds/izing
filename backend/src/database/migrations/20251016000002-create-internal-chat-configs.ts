import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("InternalChatConfigs", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Tenants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      communicationRestriction: {
        type: DataTypes.ENUM("none", "sameQueue", "sameProfile"),
        allowNull: false,
        defaultValue: "none"
      },
      allowUsersCreateGroups: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      allowUsersAddMembers: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      onlyManagersCreateGroups: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      onlyManagersAddMembers: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      restrictGroupsByQueue: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      restrictGroupsByProfile: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("InternalChatConfigs");
  }
};
