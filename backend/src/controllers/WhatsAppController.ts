// controllers/whatsappController.ts
import { Request, Response } from "express";
import { Op, QueryTypes } from "sequelize";
import { getIO } from "../libs/socket";
import { removeWbot } from "../libs/wbot";
import AppError from "../errors/AppError";
import Message from "../models/Message";
import Ticket from "../models/Ticket";

import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import { closeUserSession } from "../services/WbotServices/StartWhatsAppSession";
import { logger } from "../utils/logger";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;

  const whatsapps = await ListWhatsAppsService(tenantId);

  return res.status(200).json(whatsapps);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { tenantId } = req.user;

  const whatsapp = await ShowWhatsAppService({ id: whatsappId, tenantId });

  return res.status(200).json(whatsapp);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { tenantId } = req.user;
  const whatsapps = await ListWhatsAppsService(tenantId);
  if (whatsapps.length >= Number(process.env.CONNECTIONS_LIMIT)) {
    throw new AppError("ERR_NO_PERMISSION_CONNECTIONS_LIMIT", 400);
  }

  const { whatsapp } = await CreateWhatsAppService({
    ...whatsappData,
    whatsappId,
    tenantId
  });

  return res.status(200).json(whatsapp);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { tenantId } = req.user;

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId,
    tenantId
  });

  return res.status(200).json(whatsapp);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { tenantId } = req.user;
  await DeleteWhatsAppService(whatsappId, tenantId);
  removeWbot(+whatsappId);

  const io = getIO();
  io.emit(`${tenantId}:whatsapp`, {
    action: "delete",
    whatsappId: +whatsappId
  });

  return res.status(200).json({ message: "Whatsapp deleted." });
};

// 🔒 NOVA FUNÇÃO: Fechar sessão apenas quando usuário solicitar
export const closeSession = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { tenantId } = req.user;

  try {
    // Verificar se o WhatsApp existe e pertence ao tenant
    const whatsapp = await ShowWhatsAppService({ id: whatsappId, tenantId });
    if (!whatsapp) {
      return res.status(404).json({
        success: false,
        error: "WhatsApp não encontrado"
      });
    }

    logger.info(
      `[CLOSE] Solicitação de fechamento de sessão: ${whatsapp.name} (ID: ${whatsapp.id})`
    );

    // ✅ Fechar sessão persistente (apenas marca para não reconectar)
    await closeUserSession(whatsapp.id);

    // Atualizar status no banco
    await whatsapp.update({
      status: "DISCONNECTED",
      qrcode: null
    });

    const io = getIO();
    io.emit(`${tenantId}:whatsappSession`, {
      action: "update",
      session: whatsapp
    });

    logger.info(`[CLOSE] ✅ Sessão fechada com sucesso: ${whatsapp.name}`);

    return res.json({
      success: true,
      message: "Sessão fechada com sucesso",
      data: {
        whatsapp: whatsapp.name,
        id: whatsapp.id,
        status: "DISCONNECTED"
      }
    });
  } catch (error) {
    logger.error("[CLOSE] ❌ Erro ao fechar sessão:", error);
    return res.status(500).json({
      success: false,
      error: "Falha ao fechar sessão",
      details: error.message
    });
  }
};

// 🔍 NOVA FUNÇÃO: Status da sessão persistente
export const sessionStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { tenantId } = req.user;

  try {
    const whatsapp = await ShowWhatsAppService({ id: whatsappId, tenantId });
    if (!whatsapp) {
      return res.status(404).json({
        success: false,
        error: "WhatsApp não encontrado"
      });
    }

    const status = {
      id: whatsapp.id,
      name: whatsapp.name,
      status: whatsapp.status,
      isActive: whatsapp.isActive,
      battery: whatsapp.battery,
      plugged: whatsapp.plugged,
      lastUpdate: new Date(),
      isPersistent: true, // Todas as sessões são persistentes agora
      shouldKeepAlive: true // Sempre mantém conexão até usuário fechar
    };

    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error("[STATUS] Erro ao obter status:", error);
    return res.status(500).json({
      success: false,
      error: "Falha ao obter status da sessão"
    });
  }
};

// 📋 NOVA FUNÇÃO: Verificar mensagens pendentes
export const checkPendingMessages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { tenantId } = req.user;

  try {
    // Verificar se o WhatsApp existe e pertence ao tenant
    const whatsapp = await ShowWhatsAppService({ id: whatsappId, tenantId });
    if (!whatsapp) {
      return res.status(404).json({
        success: false,
        error: "WhatsApp não encontrado"
      });
    }

    // Buscar mensagens pendentes agendadas para esta sessão
    const where = {
      fromMe: true,
      status: "pending",
      scheduleDate: { [Op.not]: null },
      isDeleted: false,
      tenantId
    };

    const pendingMessages = await Message.findAll({
      where,
      include: [
        {
          model: Ticket,
          as: "ticket",
          where: {
            whatsappId: +whatsappId,
            tenantId
          }
        }
      ]
    });

    const count = pendingMessages.length;
    const hasPendingMessages = count > 0;

    return res.json({
      success: true,
      hasPendingMessages,
      count
    });
  } catch (error) {
    logger.error(
      "[CHECK_PENDING] Erro ao verificar mensagens pendentes:",
      error
    );
    return res.status(500).json({
      success: false,
      error: "Falha ao verificar mensagens pendentes"
    });
  }
};

// 🔍 NOVA FUNÇÃO: Buscar mensagens órfãs
export const getOrphanedMessages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tenantId } = req.user;

  try {
    // Buscar todas as sessões WhatsApp existentes do tenant
    const existingWhatsapps = await ListWhatsAppsService(tenantId);
    const validWhatsappIds = existingWhatsapps.map((w: any) => w.id);

    // Buscar todas as mensagens pendentes agendadas do tenant
    const where = {
      fromMe: true,
      status: "pending",
      scheduleDate: { [Op.not]: null },
      isDeleted: false,
      tenantId
    };

    const allPendingMessages = await Message.findAll({
      where,
      include: [
        {
          model: Ticket,
          as: "ticket",
          where: {
            tenantId
          }
        }
      ]
    });

    // Filtrar mensagens órfãs:
    // - tickets com whatsappId NULL, OU
    // - tickets cujo whatsappId não existe na lista de sessões válidas
    const orphanedMessages = allPendingMessages.filter(
      (message: any) =>
        message.ticket &&
        (message.ticket.whatsappId === null ||
          message.ticket.whatsappId === undefined ||
          !validWhatsappIds.includes(message.ticket.whatsappId))
    );

    const count = orphanedMessages.length;
    const hasOrphanedMessages = count > 0;

    return res.json({
      success: true,
      hasOrphanedMessages,
      count
    });
  } catch (error) {
    logger.error("[GET_ORPHANED] Erro ao buscar mensagens órfãs:", error);
    return res.status(500).json({
      success: false,
      error: "Falha ao buscar mensagens órfãs"
    });
  }
};

// 🔄 NOVA FUNÇÃO: Transferir mensagens órfãs
export const transferOrphanedMessages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { tenantId } = req.user;

  try {
    // Verificar se o WhatsApp existe e pertence ao tenant
    const whatsapp = await ShowWhatsAppService({ id: whatsappId, tenantId });
    if (!whatsapp) {
      return res.status(404).json({
        success: false,
        error: "WhatsApp não encontrado"
      });
    }

    // Buscar todas as sessões WhatsApp existentes do tenant
    const existingWhatsapps = await ListWhatsAppsService(tenantId);
    const validWhatsappIds = existingWhatsapps.map((w: any) => w.id);

    // Buscar todas as mensagens pendentes agendadas do tenant
    const where = {
      fromMe: true,
      status: "pending",
      scheduleDate: { [Op.not]: null },
      isDeleted: false,
      tenantId
    };

    const allPendingMessages = await Message.findAll({
      where,
      include: [
        {
          model: Ticket,
          as: "ticket",
          where: {
            tenantId
          }
        }
      ]
    });

    // Filtrar mensagens órfãs:
    // - tickets com whatsappId NULL, OU
    // - tickets cujo whatsappId não existe na lista de sessões válidas
    const orphanedMessages = allPendingMessages.filter(
      (message: any) =>
        message.ticket &&
        (message.ticket.whatsappId === null ||
          message.ticket.whatsappId === undefined ||
          !validWhatsappIds.includes(message.ticket.whatsappId))
    );

    // Obter IDs únicos dos tickets órfãos
    const orphanedTicketIds = [
      ...new Set(
        orphanedMessages
          .map((m: any) => m.ticket?.id)
          .filter((id: any) => id !== null && id !== undefined)
      )
    ];

    // Atualizar whatsappId dos tickets órfãos para a nova sessão
    let transferred = 0;
    if (orphanedTicketIds.length > 0) {
      try {
        // Usar query direta para evitar problemas com getters virtuais
        const { sequelize } = Ticket;
        if (sequelize) {
          await sequelize.query(
            'UPDATE "Tickets" SET "whatsappId" = :whatsappId, "updatedAt" = NOW() WHERE "id" IN (:ticketIds) AND "tenantId" = :tenantId',
            {
              replacements: {
                whatsappId: +whatsappId,
                ticketIds: orphanedTicketIds,
                tenantId
              },
              type: QueryTypes.UPDATE
            }
          );
          transferred = orphanedTicketIds.length;
        } else {
          // Fallback para update normal se sequelize não estiver disponível
          await Ticket.update(
            { whatsappId: +whatsappId },
            {
              where: {
                id: { [Op.in]: orphanedTicketIds },
                tenantId
              },
              individualHooks: false,
              returning: false
            }
          );
          transferred = orphanedTicketIds.length;
        }
      } catch (updateError) {
        logger.error(
          "[TRANSFER_ORPHANED] Erro ao atualizar tickets:",
          updateError
        );
        // Tentar atualizar ticket por ticket como fallback
        const updatePromises = orphanedTicketIds.map(
          async (ticketId: number) => {
            try {
              await Ticket.update(
                { whatsappId: +whatsappId },
                {
                  where: {
                    id: ticketId,
                    tenantId
                  },
                  individualHooks: false,
                  returning: false
                }
              );
              return 1;
            } catch (singleError) {
              logger.error(
                `[TRANSFER_ORPHANED] Erro ao atualizar ticket ${ticketId}:`,
                singleError
              );
              return 0;
            }
          }
        );
        const results = await Promise.all(updatePromises);
        transferred = results.reduce(
          (sum: number, val: number) => sum + val,
          0
        );
      }
    }

    return res.json({
      success: true,
      transferred
    });
  } catch (error) {
    logger.error(
      "[TRANSFER_ORPHANED] Erro ao transferir mensagens órfãs:",
      error
    );
    return res.status(500).json({
      success: false,
      error: "Falha ao transferir mensagens órfãs"
    });
  }
};
