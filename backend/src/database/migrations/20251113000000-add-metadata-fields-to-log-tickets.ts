import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Adicionar colunas apenas se não existirem
      const tableDescription: any = await queryInterface.describeTable(
        "LogTickets"
      );

      if (!tableDescription.description) {
        await queryInterface.addColumn(
          "LogTickets",
          "description",
          {
            type: DataTypes.TEXT,
            allowNull: true
          },
          { transaction }
        );
      }

      if (!tableDescription.metadata) {
        await queryInterface.addColumn(
          "LogTickets",
          "metadata",
          {
            type: DataTypes.JSON,
            allowNull: true
          },
          { transaction }
        );
      }

      if (!tableDescription.toUserId) {
        await queryInterface.addColumn(
          "LogTickets",
          "toUserId",
          {
            type: DataTypes.INTEGER,
            allowNull: true
          },
          { transaction }
        );
      }

      if (!tableDescription.fromQueueId) {
        await queryInterface.addColumn(
          "LogTickets",
          "fromQueueId",
          {
            type: DataTypes.INTEGER,
            allowNull: true
          },
          { transaction }
        );
      }

      // Tornar queueId nullable
      await queryInterface.changeColumn(
        "LogTickets",
        "queueId",
        {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        { transaction }
      );

      // Adicionar foreign keys usando SQL direto (verificar se já existem)
      const [constraints]: any = await queryInterface.sequelize.query(
        `
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'LogTickets'
        AND constraint_name = 'LogTickets_toUserId_fkey';
      `,
        { transaction }
      );

      if (constraints.length === 0) {
        await queryInterface.sequelize.query(
          `
          ALTER TABLE "LogTickets"
          ADD CONSTRAINT "LogTickets_toUserId_fkey"
          FOREIGN KEY ("toUserId")
          REFERENCES "Users"("id")
          ON UPDATE CASCADE
          ON DELETE SET NULL;
        `,
          { transaction }
        );
      }

      const [constraintsQueue]: any = await queryInterface.sequelize.query(
        `
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'LogTickets'
        AND constraint_name = 'LogTickets_fromQueueId_fkey';
      `,
        { transaction }
      );

      if (constraintsQueue.length === 0) {
        await queryInterface.sequelize.query(
          `
          ALTER TABLE "LogTickets"
          ADD CONSTRAINT "LogTickets_fromQueueId_fkey"
          FOREIGN KEY ("fromQueueId")
          REFERENCES "Queues"("id")
          ON UPDATE CASCADE
          ON DELETE SET NULL;
        `,
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remover foreign keys
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "LogTickets"
        DROP CONSTRAINT IF EXISTS "LogTickets_toUserId_fkey";
      `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "LogTickets"
        DROP CONSTRAINT IF EXISTS "LogTickets_fromQueueId_fkey";
      `,
        { transaction }
      );

      // Remover colunas
      await queryInterface.removeColumn("LogTickets", "description", {
        transaction
      });
      await queryInterface.removeColumn("LogTickets", "metadata", {
        transaction
      });
      await queryInterface.removeColumn("LogTickets", "toUserId", {
        transaction
      });
      await queryInterface.removeColumn("LogTickets", "fromQueueId", {
        transaction
      });

      // Reverter queueId para not null
      await queryInterface.changeColumn(
        "LogTickets",
        "queueId",
        {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
