import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Tabela de Grupos
    await queryInterface.createTable("InternalGroups", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdBy: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      tenantId: {
        type: DataTypes.INTEGER,
        references: { model: "Tenants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      }
    });

    // Tabela de Membros dos Grupos
    await queryInterface.createTable("InternalGroupMembers", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      groupId: {
        type: DataTypes.INTEGER,
        references: { model: "InternalGroups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM("admin", "member"),
        defaultValue: "member",
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      joinedAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      },
      leftAt: {
        type: DataTypes.DATE(6),
        allowNull: true
      }
    });

    // Índice único para evitar duplicação de membros
    await queryInterface.addIndex("InternalGroupMembers", ["userId", "groupId"], {
      unique: true,
      name: "unique_user_group"
    });

    // Tabela de Mensagens
    await queryInterface.createTable("InternalMessages", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      senderId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      recipientId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: true
      },
      groupId: {
        type: DataTypes.INTEGER,
        references: { model: "InternalGroups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: true
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      mediaUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      mediaType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      mediaName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      isEdited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      quotedMessageId: {
        type: DataTypes.INTEGER,
        references: { model: "InternalMessages", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      tenantId: {
        type: DataTypes.INTEGER,
        references: { model: "Tenants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      }
    });

    // Índices para otimização de queries
    await queryInterface.addIndex("InternalMessages", ["senderId", "recipientId"]);
    await queryInterface.addIndex("InternalMessages", ["groupId"]);
    await queryInterface.addIndex("InternalMessages", ["tenantId"]);
    await queryInterface.addIndex("InternalMessages", ["createdAt"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("InternalMessages");
    await queryInterface.dropTable("InternalGroupMembers");
    await queryInterface.dropTable("InternalGroups");
  }
};

