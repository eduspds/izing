import { Op } from "sequelize";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import UserMessagesLog from "../../models/UserMessagesLog";
import { logger } from "../../utils/logger";
import { StartWhatsAppSessionVerify } from "./StartWhatsAppSessionVerify";
import { normalizePhoneNumber } from "../../utils/phoneNumberNormalizer";
import { findMostSimilarNumber } from "../../utils/phoneNumberSimilarity";
import Contact from "../../models/Contact";
import { toBaileysJid } from "../../types/baileysAdapter";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  userId?: number | string | undefined;
}

const isInternationalNumber = (number: string): boolean => {
  try {
    const parsed = parsePhoneNumberFromString(number);
    return parsed !== undefined && parsed.country !== undefined && parsed.country !== "BR";
  } catch {
    const clean = number.replace(/\D/g, "");
    return number.startsWith("+") || (clean.length > 10 && !clean.startsWith("55"));
  }
};

const checkAndFixContactNumberBeforeSend = async (ticket: Ticket): Promise<Ticket> => {
  if (ticket.isGroup || !ticket.contact.number) return ticket;
  if (isInternationalNumber(ticket.contact.number)) return ticket;
  const normalized = normalizePhoneNumber(ticket.contact.number);
  if (!normalized.hasChanges) return ticket;

  const allContacts = await Contact.findAll({
    where: { tenantId: ticket.tenantId, isGroup: false, number: { [Op.ne]: null as any } },
    attributes: ["id", "number", "name"]
  });
  const existingNumbers = allContacts.map(c => c.number);
  const similarContact = findMostSimilarNumber(ticket.contact.number, existingNumbers, 90);
  if (similarContact) {
    const existingContact = allContacts.find(c => c.number === similarContact.number);
    if (existingContact && existingContact.id !== ticket.contact.id) {
      await ticket.update({ contactId: existingContact.id });
      ticket.contact = existingContact;
      return ticket;
    }
  }
  await ticket.contact.update({ number: normalized.normalized });
  return ticket;
};

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg,
  userId
}: Request): Promise<{ key: { id: string } }> => {
  const correctedTicket = await checkAndFixContactNumberBeforeSend(ticket);
  const wbot = await GetTicketWbot(correctedTicket);
  const jid = toBaileysJid(correctedTicket.contact.number, correctedTicket.isGroup);

  let quotedKey: { remoteJid: string; id: string; fromMe: boolean } | undefined;
  if (quotedMsg?.messageId) {
    const inCache = await GetWbotMessage(correctedTicket, quotedMsg.messageId, 200);
    if (inCache) {
      quotedKey = { remoteJid: jid, id: quotedMsg.messageId, fromMe: quotedMsg.fromMe };
    }
  }

  try {
    const result = await wbot.sock.sendMessage(jid, { text: body }, {
      quoted: quotedKey ? { key: quotedKey, message: {} } : undefined
    }) as any;

    await correctedTicket.update({ lastMessage: body, lastMessageAt: new Date().getTime() });
    if (userId && result?.key?.id) {
      await UserMessagesLog.create({
        messageId: result.key.id,
        userId,
        ticketId: correctedTicket.id
      });
    }
    return result ?? { key: { id: "" } };
  } catch (err) {
    logger.error(`SendWhatsAppMessage | Error: ${err}`);
    await StartWhatsAppSessionVerify(correctedTicket.whatsappId, err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
