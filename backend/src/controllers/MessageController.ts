/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import DeleteMessageSystem from "../helpers/DeleteMessageSystem";
import EditMessageSystem from "../helpers/EditMessageSystem";
// import GetTicketWbot from "../helpers/GetTicketWbot";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import Message from "../models/Message";
import User from "../models/User";
import CreateForwardMessageService from "../services/MessageServices/CreateForwardMessageService";
// import CreateMessageOffilineService from "../services/MessageServices/CreateMessageOfflineService";
import CreateMessageSystemService from "../services/MessageServices/CreateMessageSystemService";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import CreateLogTicketService from "../services/TicketServices/CreateLogTicketService";
// import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import { logger } from "../utils/logger";
// import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
// import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  sendType?: string;
  scheduleDate?: string | Date;
  quotedMsg?: Message;
  idFront?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;
  const { tenantId, id: userId, profile: userProfile } = req.user;

  const { count, messages, messagesOffLine, ticket, hasMore } =
    await ListMessagesService({
      pageNumber,
      ticketId,
      tenantId,
      userId: Number(userId),
      userProfile
    });

  try {
    SetTicketMessagesAsRead(ticket);
  } catch (error) {
    console.log("SetTicketMessagesAsRead", error);
  }

  const serializedMessages = messages.map((m: Message) => (m as any).toJSON ? (m as any).toJSON() : m);
  const serializedOffLine = messagesOffLine.map((m: any) => m.toJSON ? m.toJSON() : m);
  return res.json({
    count,
    messages: serializedMessages,
    messagesOffLine: serializedOffLine,
    ticket,
    hasMore
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { tenantId, id: userId, profile: userProfile } = req.user;
  const messageData: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  const ticket = await ShowTicketService({ id: ticketId, tenantId, userId: Number(userId), userProfile });

  try {
    SetTicketMessagesAsRead(ticket);
  } catch (error) {
    console.log("SetTicketMessagesAsRead", error);
  }

  await CreateMessageSystemService({
    msg: messageData,
    tenantId,
    medias,
    ticket,
    userId,
    scheduleDate: messageData.scheduleDate,
    sendType: messageData.sendType || "chat",
    status: "pending",
    idFront: messageData.idFront,
    userProfile
  });

  // Log de mensagem enviada ou agendada
  try {
    // Buscar a mensagem criada para obter createdAt e messageId
    let createdMessage: Message | null = null;
    if (messageData.idFront) {
      createdMessage = await Message.findOne({
        where: {
          idFront: messageData.idFront,
          ticketId: Number(ticketId),
          tenantId
        },
        order: [["createdAt", "DESC"]]
      });
    } else {
      // Se não tiver idFront, buscar a última mensagem criada para este ticket
      // Filtrar também por scheduleDate se for mensagem agendada
      const whereCondition: any = {
        ticketId: Number(ticketId),
        tenantId,
        userId: Number(userId),
        fromMe: true
      };
      
      if (messageData.scheduleDate) {
        whereCondition.scheduleDate = messageData.scheduleDate;
      }
      
      createdMessage = await Message.findOne({
        where: whereCondition,
        order: [["createdAt", "DESC"]]
      });
    }

    // Buscar informações do usuário que criou
    let createdBy: string | null = null;
    if (userId) {
      try {
        const user = await User.findByPk(Number(userId), {
          attributes: ["name"]
        });
        createdBy = user?.name || null;
      } catch (error) {
        logger.error(`Erro ao buscar usuário para log: ${error}`);
      }
    }

    // Preparar metadata com informações de criação
    const baseMetadata: any = {
      hasMedia: !!medias && medias.length > 0,
      mediaCount: medias?.length || 0,
      bodyPreview: messageData.body?.substring(0, 100),
      messageId: createdMessage?.id || null
    };

    // Adicionar createdAt e createdBy se disponíveis
    if (createdMessage?.createdAt) {
      baseMetadata.createdAt = createdMessage.createdAt;
    } else {
      baseMetadata.createdAt = new Date();
    }
    
    if (createdBy) {
      baseMetadata.createdBy = createdBy;
    }

    if (messageData.scheduleDate) {
      await CreateLogTicketService({
        userId,
        ticketId: Number(ticketId),
        type: "messageScheduled",
        queueId: ticket.queueId,
        description: `Agendou mensagem para ${new Date(
          messageData.scheduleDate
        ).toLocaleString("pt-BR")}`,
        metadata: {
          ...baseMetadata,
          scheduleDate: messageData.scheduleDate
        }
      });
    } else {
      await CreateLogTicketService({
        userId,
        ticketId: Number(ticketId),
        type: "messageSent",
        queueId: ticket.queueId,
        description: `Enviou mensagem${
          medias && medias.length > 0 ? " com mídia" : ""
        }`,
        metadata: {
          ...baseMetadata,
          sendType: messageData.sendType || "chat"
        }
      });
    }
  } catch (error) {
    logger.error(`Erro ao criar log de mensagem: ${error}`);
  }

  return res.send();
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { tenantId } = req.user;
  const { id, newBody, scheduleDate } = req.body;

  if (!newBody || newBody.trim() === "") {
    throw new AppError("ERR_MESSAGE_BODY_REQUIRED");
  }

  try {
    const message = await EditMessageSystem({
      id,
      messageId,
      newBody,
      tenantId,
      scheduleDate
    });

    return res.status(200).json(message);
  } catch (error) {
    logger.error(`ERR_EDIT_SYSTEM_MSG: ${error}`);
    throw new AppError("ERR_EDIT_SYSTEM_MSG");
  }
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { tenantId } = req.user;
  try {
    await DeleteMessageSystem(req.body.id, messageId, tenantId);
  } catch (error) {
    logger.error(`ERR_DELETE_SYSTEM_MSG: ${error}`);
    throw new AppError("ERR_DELETE_SYSTEM_MSG");
  }

  return res.send();
};

export const forward = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body;
  const { user } = req;

  try {
    for (const message of data.messages) {
      await CreateForwardMessageService({
        userId: user.id,
        tenantId: user.tenantId,
        message,
        contact: data.contact,
        ticketIdOrigin: message.ticketId
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mensagens encaminhadas com sucesso"
    });
  } catch (error) {
    logger.error("Erro ao encaminhar mensagens:", error);
    return res.status(500).json({
      success: false,
      error: "Erro ao encaminhar mensagens",
      message: error.message
    });
  }
};
