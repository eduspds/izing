import { QueryInterface } from "sequelize";

const PERMISSIONS = [
  { name: "tags-access", description: "Acesso à tela de Etiquetas (Tags)" },
  { name: "contacts-access", description: "Acesso à tela de Contatos" },
  { name: "campaigns-access", description: "Acesso à tela de Campanhas" },
  { name: "kanban-access", description: "Acesso à tela de Kanban" },
  { name: "dashboard-all-view", description: "Visualização completa do Dashboard" },
  { name: "users-access", description: "Acesso à gestão de Usuários" },
  { name: "queues-access", description: "Acesso à gestão de Filas" },
  { name: "quick-messages-access", description: "Acesso a Mensagens Rápidas" },
  { name: "auto-reply-access", description: "Acesso a Auto Resposta / Chatbot" },
  { name: "chat-flow-access", description: "Acesso a Chat Flow (Fluxos)" },
  { name: "settings-access", description: "Acesso a Configurações" },
  { name: "sessions-access", description: "Acesso a Sessões WhatsApp" },
  { name: "reports-access", description: "Acesso a Relatórios" },
  { name: "api-service-access", description: "Acesso ao API Service" },
  { name: "closing-reasons-access", description: "Acesso a Motivos de Encerramento" },
  { name: "schedule-access", description: "Acesso a Horário de Atendimento" },
  { name: "releases-access", description: "Acesso a Releases" },
  { name: "atendimento-access", description: "Acesso ao painel de Atendimento" },
  { name: "internal-chat-access", description: "Acesso ao Chat Interno" },
  { name: "permissions-access", description: "Acesso à gestão de Permissões (apenas Admin)" },
];

module.exports = {
  up: (queryInterface: QueryInterface) => {
    const now = new Date();
    const rows = PERMISSIONS.map((p, i) => ({
      id: i + 1,
      name: p.name,
      description: p.description,
      createdAt: now,
      updatedAt: now,
    }));
    return queryInterface.bulkInsert("Permissions", rows);
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Permissions", {});
  },
};
