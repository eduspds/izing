import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import Setting from "../../models/Setting";
import socketEmit from "../../helpers/socketEmit";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import { logger } from "../../utils/logger";

/**
 * Serviço para verificar e fechar tickets com avaliação expirada
 * Este serviço deve ser executado periodicamente (via cron/schedule)
 */
const CheckExpiredEvaluationsService = async (): Promise<void> => {
  try {
    // Buscar todos os tenants com configuração de timeout
    const settings = await Setting.findAll({
      where: { key: "evaluationTimeoutMinutes" }
    });

    for (const setting of settings) {
      const timeoutMinutes = parseInt(setting.value, 10);
      if (isNaN(timeoutMinutes) || timeoutMinutes <= 0) {
        continue;
      }

      const timeoutMs = timeoutMinutes * 60 * 1000;
      const expiredTimestamp = new Date().getTime() - timeoutMs;

      // Buscar tickets em avaliação que expiraram
      const expiredTickets = await Ticket.findAll({
        where: {
          tenantId: setting.tenantId,
          status: "pending_evaluation",
          isEvaluationFlow: true,
          evaluationStartedAt: {
            [Op.lte]: expiredTimestamp
          }
        }
      });

      // Fechar cada ticket expirado
      for (const ticket of expiredTickets) {
        await ticket.update({
          status: "closed",
          closedAt: new Date().getTime(),
          chatFlowId: null,
          stepChatFlow: null,
          isEvaluationFlow: false,
          evaluationStartedAt: null,
          botRetries: 0
        });

        await CreateLogTicketService({
          ticketId: ticket.id,
          type: "evaluationExpired"
        });

        socketEmit({
          tenantId: ticket.tenantId,
          type: "ticket:update",
          payload: ticket
        });

        logger.info(
          `Ticket ${ticket.id} fechado por timeout de avaliação (${timeoutMinutes} minutos)`
        );
      }

      if (expiredTickets.length > 0) {
        logger.info(
          `Fechados ${expiredTickets.length} tickets por timeout de avaliação no tenant ${setting.tenantId}`
        );
      }
    }
  } catch (error) {
    logger.error("Erro ao verificar avaliações expiradas:", error);
  }
};

export default CheckExpiredEvaluationsService;

