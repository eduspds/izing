import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const sequelize = queryInterface.sequelize;
    const now = new Date();

    // Todos os usuários recebem dashboard, contatos e atendimento (evitando duplicatas)
    await sequelize.query(
      `
      INSERT INTO "UserPermissions" ("userId", "permissionId", "createdAt", "updatedAt")
      SELECT u.id, p.id, ?, ?
      FROM "Users" u
      CROSS JOIN "Permissions" p
      WHERE p.name IN ('dashboard-all-view', 'contacts-access', 'atendimento-access')
      AND NOT EXISTS (
        SELECT 1 FROM "UserPermissions" up
        WHERE up."userId" = u.id AND up."permissionId" = p.id
      )
      `,
      { replacements: [now, now] }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.query(
      `
      DELETE FROM "UserPermissions"
      WHERE "permissionId" IN (
        SELECT id FROM "Permissions"
        WHERE name IN ('dashboard-all-view', 'contacts-access', 'atendimento-access')
      )
      `,
      {}
    );
  }
};
