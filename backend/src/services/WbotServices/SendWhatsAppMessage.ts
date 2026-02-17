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
import Whatsapp from "../../models/Whatsapp";
import { toBaileysJid } from "../../types/baileysAdapter";

/** Garante número brasileiro com DDI 55 para o JID (evita envio falho por número sem DDI). */
function ensureBrazilianJidNumber(number: string): string {
  const clean = (number || "").replace(/\D/g, "");
  if (clean.length >= 12) return clean;
  if (clean.length >= 10 && clean.length <= 11 && !clean.startsWith("55")) {
    return "55" + clean;
  }
  return clean;
}

/** Até 3 botões (limite WhatsApp). Formato Baileys: buttonId, buttonText.displayText, type: 1 (quick reply) */
export type ChatFlowButton = {
  buttonId: string;
  buttonText: { displayText: string };
  type: number;
};

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  userId?: number | string | undefined;
  /** Opcional: até 3 botões para mensagem interativa. Se o dispositivo não suportar, envia só texto. */
  buttons?: ChatFlowButton[];
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

const MAX_BUTTONS = 3;

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg,
  userId,
  buttons
}: Request): Promise<{ key: { id: string } }> => {
  const correctedTicket = await checkAndFixContactNumberBeforeSend(ticket);
  const wbot = await GetTicketWbot(correctedTicket);
  const numberForJid =
    correctedTicket.isGroup || isInternationalNumber(correctedTicket.contact?.number || "")
      ? correctedTicket.contact?.number || ""
      : ensureBrazilianJidNumber(correctedTicket.contact?.number || "");
  const jid = toBaileysJid(numberForJid, correctedTicket.isGroup);

  const sessionWhatsapp = await Whatsapp.findByPk(correctedTicket.whatsappId, { attributes: ["number"] }).catch(() => null);
  const sessionNumber = (sessionWhatsapp as any)?.number;
  if (sessionNumber && !correctedTicket.isGroup) {
    const sessionNorm = String(sessionNumber).replace(/\D/g, "");
    const jidNum = jid.replace(/@.*$/, "").replace(/\D/g, "");
    if (sessionNorm === jidNum || "55" + sessionNorm === jidNum || sessionNorm === jidNum.slice(-sessionNorm.length)) {
      logger.warn(`SendWhatsAppMessage | Enviando para o próprio número da sessão (jid=${jid}) – verifique no WhatsApp em "Mensagens para você mesmo" ou teste com outro número`);
    }
  }

  let quotedKey: { remoteJid: string; id: string; fromMe: boolean } | undefined;
  if (quotedMsg?.messageId) {
    const inCache = await GetWbotMessage(correctedTicket, quotedMsg.messageId, 200);
    if (inCache) {
      quotedKey = { remoteJid: jid, id: quotedMsg.messageId, fromMe: quotedMsg.fromMe };
    }
  }

  const options = { quoted: quotedKey ? { key: quotedKey, message: {} } : undefined };

  const normalizedButtons =
    Array.isArray(buttons) && buttons.length > 0 && buttons.length <= MAX_BUTTONS
      ? buttons.slice(0, MAX_BUTTONS).map(btn => ({
          buttonId: String(btn.buttonId || "").trim() || undefined,
          buttonText: { displayText: String(btn.buttonText?.displayText ?? "").trim() || "Opção" },
          type: 1 as const
        }))
      : undefined;

  try {
    logger.info(
      `SendWhatsAppMessage | Enviando ticketId=${correctedTicket.id} jid=${jid} bodyLen=${(body || "").length}`
    );

    let result: any;

    if (normalizedButtons && normalizedButtons.every(b => b.buttonId && b.buttonText.displayText)) {
      try {
        result = await wbot.sock.sendMessage(jid, { text: body, buttons: normalizedButtons }, options);
      } catch (buttonErr: any) {
        const errMsg = (buttonErr?.message || "").toLowerCase();
        if (
          errMsg.includes("button") ||
          errMsg.includes("interactive") ||
          errMsg.includes("not support") ||
          errMsg.includes("protocol")
        ) {
          logger.warn(`SendWhatsAppMessage | Botões não suportados, enviando só texto: ${buttonErr?.message}`);
          result = await wbot.sock.sendMessage(jid, { text: body }, options);
        } else {
          throw buttonErr;
        }
      }
    } else {
      result = await wbot.sock.sendMessage(jid, { text: body }, options);
    }

    logger.info(
      `SendWhatsAppMessage | Enviado ticketId=${correctedTicket.id} jid=${jid} messageKey=${result?.key?.id ?? "n/a"}`
    );

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
