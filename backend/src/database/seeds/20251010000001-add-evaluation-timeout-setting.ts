import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.query(
      `
      INSERT INTO public."Settings" ("key", value, "createdAt", "updatedAt", "tenantId") 
      SELECT 'evaluationTimeoutMinutes', '60', NOW(), NOW(), id FROM "Tenants";
      `
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.query(
      `DELETE FROM public."Settings" WHERE "key" = 'evaluationTimeoutMinutes';`
    );
  }
};

