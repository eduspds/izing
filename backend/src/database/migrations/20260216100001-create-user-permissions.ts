import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("UserPermissions", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      permissionId: {
        type: DataTypes.INTEGER,
        references: { model: "Permissions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    }).then(() => {
      return queryInterface.addIndex("UserPermissions", ["userId", "permissionId"], {
        unique: true,
        name: "user_permissions_user_id_permission_id_unique"
      });
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("UserPermissions");
  }
};
