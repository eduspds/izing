import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.query(
      `
        INSERT INTO public."Contacts" (id, name, number, email, "profilePicUrl", "pushname", "telegramId", "messengerId", "instagramPK", "isUser", "isWAContact", "isGroup", "createdAt", "updatedAt", "tenantId") VALUES
        (19, 'Suporte Técnico', '5511999999999', 'suporte@empresa.com', '', 'Suporte Técnico', NULL, NULL, NULL, false, false, false, NOW(), NOW(), 1)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          number = EXCLUDED.number,
          email = EXCLUDED.email,
          "profilePicUrl" = EXCLUDED."profilePicUrl",
          "pushname" = EXCLUDED."pushname",
          "updatedAt" = NOW();
      `
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Contacts", { id: 19 });
  }
};
