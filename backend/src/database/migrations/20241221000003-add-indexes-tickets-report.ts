import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Índices para otimizar queries do relatório de tickets
    
    // Índice principal para filtros mais comuns (tenantId, createdAt, status)
    await queryInterface.addIndex("Tickets", ["tenantId", "createdAt", "status"], {
      name: "idx_tickets_tenant_created_status"
    });

    // Índice para filtro por canal WhatsApp
    await queryInterface.addIndex("Tickets", ["tenantId", "whatsappId", "createdAt"], {
      name: "idx_tickets_tenant_whatsapp_created"
    });

    // Índice para filtro por usuário
    await queryInterface.addIndex("Tickets", ["tenantId", "userId", "createdAt"], {
      name: "idx_tickets_tenant_user_created"
    });

    // Índice para filtro por departamento (queue)
    await queryInterface.addIndex("Tickets", ["tenantId", "queueId", "createdAt"], {
      name: "idx_tickets_tenant_queue_created"
    });

    // Índice para filtro por motivo de encerramento
    await queryInterface.addIndex("Tickets", ["tenantId", "endConversationId"], {
      name: "idx_tickets_tenant_end_conversation"
    });

    // Índice para busca de primeiro e último atendente no LogTickets
    await queryInterface.addIndex("LogTickets", ["ticketId", "type", "createdAt"], {
      name: "idx_log_tickets_ticket_type_created"
    });

    // Índice para filtro por tags (ContactTags)
    await queryInterface.addIndex("ContactTags", ["contactId", "tagId"], {
      name: "idx_contact_tags_contact_tag"
    });

    // Índice adicional para LogTickets por tipo para otimizar CTEs
    await queryInterface.addIndex("LogTickets", ["type", "ticketId", "createdAt"], {
      name: "idx_log_tickets_type_ticket_created"
    });

    // Índice para ordenação por updatedAt
    await queryInterface.addIndex("Tickets", ["tenantId", "updatedAt"], {
      name: "idx_tickets_tenant_updated"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Remover índices na ordem inversa
    await queryInterface.removeIndex("Tickets", "idx_tickets_tenant_updated");
    await queryInterface.removeIndex("LogTickets", "idx_log_tickets_type_ticket_created");
    await queryInterface.removeIndex("ContactTags", "idx_contact_tags_contact_tag");
    await queryInterface.removeIndex("LogTickets", "idx_log_tickets_ticket_type_created");
    await queryInterface.removeIndex("Tickets", "idx_tickets_tenant_end_conversation");
    await queryInterface.removeIndex("Tickets", "idx_tickets_tenant_queue_created");
    await queryInterface.removeIndex("Tickets", "idx_tickets_tenant_user_created");
    await queryInterface.removeIndex("Tickets", "idx_tickets_tenant_whatsapp_created");
    await queryInterface.removeIndex("Tickets", "idx_tickets_tenant_created_status");
  }
};
