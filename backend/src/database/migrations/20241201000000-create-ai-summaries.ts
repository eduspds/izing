import { QueryInterface, DataTypes } from 'sequelize';

export = {
  up: async (queryInterface: QueryInterface, Sequelize: typeof DataTypes) => {
    await queryInterface.createTable('ai_summaries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      ticket_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      message_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      model: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: 'gemini-1.5-flash'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Adicionar índices
    await queryInterface.addIndex('ai_summaries', ['ticket_id', 'tenant_id'], {
      name: 'ai_summaries_ticket_tenant_idx'
    });

    await queryInterface.addIndex('ai_summaries', ['created_at'], {
      name: 'ai_summaries_created_at_idx'
    });
  },

  down: async (queryInterface: QueryInterface, Sequelize: typeof DataTypes) => {
    await queryInterface.dropTable('ai_summaries');
  }
};
