import type { IBaileysMessageAdapter } from "../types/baileysAdapter";
import { toBaileysJid } from "../types/baileysAdapter";
import Ticket from "../models/Ticket";
import GetTicketWbot from "./GetTicketWbot";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import { whatsAppManager } from "../libs/wbot";
import { buildBaileysMessageAdapter } from "../libs/baileysMessageAdapter";
import type { proto } from "@whiskeysockets/baileys";

export const GetWbotMessage = async (
  ticket: Ticket,
  messageId: string,
  _totalMessages = 100
): Promise<IBaileysMessageAdapter | undefined> => {
  const wbot = await GetTicketWbot(ticket);
  const jid = toBaileysJid(ticket.contact.number, ticket.isGroup);
  const stored = whatsAppManager.getStoredMessage?.(ticket.whatsappId!, jid, messageId);
  if (!stored) {
    logger.warn(`GetWbotMessage: Mensagem não encontrada no cache: ${messageId}`);
    return undefined;
  }
  const fullMsg = stored as proto.IWebMessageInfo & { key: proto.IMessageKey; message?: proto.IMessage };
  return buildBaileysMessageAdapter(fullMsg, wbot.sock, wbot.id);
};

export default GetWbotMessage;
