import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Criar tabela TicketKanbans
    await queryInterface.createTable("TicketKanbans", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high"),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("pending", "in_progress", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "pending"
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false
      },
      mediaType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      ticketId: {
        type: DataTypes.INTEGER,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // Criar tabela TicketKanbanUsers (tabela intermediária)
    await queryInterface.createTable("TicketKanbanUsers", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ticketKanbanId: {
        type: DataTypes.INTEGER,
        references: { model: "TicketKanbans", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
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
    });

    // Adicionar índice único para evitar duplicação de usuários no mesmo TicketKanban
    await queryInterface.addIndex("TicketKanbanUsers", ["ticketKanbanId", "userId"], {
      unique: true,
      name: "unique_ticketkanban_user"
    });

    // Adicionar campo canKanban na tabela EndConversations (se ainda não existir)
    try {
      await queryInterface.addColumn("EndConversations", "canKanban", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    } catch (error) {
      // Ignora erro se a coluna já existir
      console.log("Campo canKanban já existe ou erro ao adicionar:", error);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    // Remover índice único
    try {
      await queryInterface.removeIndex("TicketKanbanUsers", "unique_ticketkanban_user");
    } catch (error) {
      // Ignora erro se o índice não existir
    }

    // Remover tabelas
    await queryInterface.dropTable("TicketKanbanUsers");
    await queryInterface.dropTable("TicketKanbans");

    // Remover campo canKanban da tabela EndConversations
    try {
      await queryInterface.removeColumn("EndConversations", "canKanban");
    } catch (error) {
      // Ignora erro se a coluna não existir
    }
  }
};
