import { Request, Response } from "express";
import CreateMessageService from "../services/InternalChatServices/CreateMessageService";
import ListMessagesService from "../services/InternalChatServices/ListMessagesService";
import ListUserChatsService from "../services/InternalChatServices/ListUserChatsService";
import ListAvailableContactsService from "../services/InternalChatServices/ListAvailableContactsService";
import MarkAsReadService from "../services/InternalChatServices/MarkAsReadService";
import AppError from "../errors/AppError";

export const createMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { recipientId, groupId, message } = req.body;
  const senderId = Number(req.user.id);
  const { tenantId } = req.user;

  const medias = req.files as Express.Multer.File[];

  // Se houver arquivos, criar uma mensagem para cada
  if (medias && medias.length > 0) {
    const messages = await Promise.all(
      medias.map(async (media) => {
        return await CreateMessageService({
          senderId,
          recipientId: recipientId ? Number(recipientId) : undefined,
          groupId: groupId ? Number(groupId) : undefined,
          message: message || media.originalname || "",
          mediaUrl: media.filename, // Nome do arquivo salvo pelo multer
          mediaType: media.mimetype,
          mediaName: media.originalname,
          tenantId
        });
      })
    );

    return res.status(200).json(messages);
  }

  // Se não houver arquivos, criar mensagem de texto
  if (!message || !message.trim()) {
    throw new AppError("Message or media is required", 400);
  }

  const newMessage = await CreateMessageService({
    senderId,
    recipientId: recipientId ? Number(recipientId) : undefined,
    groupId: groupId ? Number(groupId) : undefined,
    message,
    tenantId
  });

  return res.status(200).json(newMessage);
};

export const listMessages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = Number(req.user.id);
  const { recipientId, groupId } = req.query;
  const { tenantId } = req.user;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const offset = req.query.offset ? Number(req.query.offset) : 0;

  const result = await ListMessagesService({
    userId,
    recipientId: recipientId ? Number(recipientId) : undefined,
    groupId: groupId ? Number(groupId) : undefined,
    tenantId,
    limit,
    offset
  });

  return res.status(200).json(result);
};

export const listUserChats = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = Number(req.user.id);
  const { tenantId } = req.user;

  const chats = await ListUserChatsService({
    userId,
    tenantId
  });

  return res.status(200).json(chats);
};

export const markAsRead = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = Number(req.user.id);
  const { recipientId, groupId } = req.body;
  const { tenantId } = req.user;

  const updatedCount = await MarkAsReadService({
    userId,
    recipientId: recipientId ? Number(recipientId) : undefined,
    groupId: groupId ? Number(groupId) : undefined,
    tenantId
  });

  return res.status(200).json({ count: updatedCount });
};

export const listAvailableContacts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = Number(req.user.id);
  const { tenantId } = req.user;

  const contacts = await ListAvailableContactsService({
    userId,
    tenantId
  });

  return res.status(200).json(contacts);
};

