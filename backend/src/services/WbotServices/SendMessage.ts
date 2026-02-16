import { join } from "path";
import { readFile } from "fs/promises";
import { Op } from "sequelize";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import { getWbot, whatsAppManager } from "../../libs/wbot";
import ConvertAudioToOpus from "../../helpers/ConvertAudioToOpus";
import { normalizePhoneNumber } from "../../utils/phoneNumberNormalizer";
import { findMostSimilarNumber } from "../../utils/phoneNumberSimilarity";
import Contact from "../../models/Contact";
import { toBaileysJid } from "../../types/baileysAdapter";
import { getIO } from "../../libs/socket";
import socketEmit from "../../helpers/socketEmit";

const isInternationalNumber = (number: string): boolean => {
  try {
    const parsed = parsePhoneNumberFromString(number);
    return (
      parsed !== undefined &&
      parsed.country !== undefined &&
      parsed.country !== "BR"
    );
  } catch {
    const clean = number.replace(/\D/g, "");
    return (
      number.startsWith("+") || (clean.length > 10 && !clean.startsWith("55"))
    );
  }
};

const checkAndFixContactNumberBeforeSend = async (message: Message): Promise<Message> => {
  const { ticket } = message;
  if (ticket.isGroup || !message.contact.number) return message;
  if (isInternationalNumber(message.contact.number)) {
    logger.info(`[SendMessage] Número internacional: ${message.contact.number}`);
    return message;
  }
  const normalized = normalizePhoneNumber(message.contact.number);
  if (!normalized.hasChanges) return message;
  logger.info(`[SendMessage] Número com 9: ${message.contact.number} → ${normalized.normalized}`);

  const allContacts = await Contact.findAll({
    where: { tenantId: ticket.tenantId, isGroup: false, number: { [Op.ne]: null as any } },
    attributes: ["id", "number", "name"]
  });
  const existingNumbers = allContacts.map(c => c.number);
  const similarContact = findMostSimilarNumber(message.contact.number, existingNumbers, 90);
  if (similarContact) {
    const existingContact = allContacts.find(c => c.number === similarContact.number);
    if (existingContact && existingContact.id !== message.contact.id) {
      await message.update({ contactId: existingContact.id });
      message.contact = existingContact;
      return message;
    }
  }
  await message.contact.update({ number: normalized.normalized });
  return message;
};

const SendMessage = async (message: Message): Promise<void> => {
  logger.info(`SendMessage: ${message.id}`);
  const correctedMessage = await checkAndFixContactNumberBeforeSend(message);

  const isReady = await whatsAppManager.isWbotReady(correctedMessage.ticket.whatsappId);
  if (!isReady) {
    logger.warn(
      `SendMessage: Wbot não está pronto para sessão ${correctedMessage.ticket.whatsappId}. Mensagem ${message.id} será reenviada.`
    );
    throw new Error("ERR_WAPP_NOT_READY");
  }

  const wbot = getWbot(correctedMessage.ticket.whatsappId);
  const { ticket } = correctedMessage;
  const contactNumber = correctedMessage.contact.number;
  const jid = toBaileysJid(contactNumber, ticket?.isGroup ?? false);

  let quotedMsgKey: { remoteJid: string; id: string; fromMe: boolean } | undefined;
  if (correctedMessage.quotedMsg) {
    quotedMsgKey = {
      remoteJid: jid,
      id: correctedMessage.quotedMsg.messageId,
      fromMe: correctedMessage.quotedMsg.fromMe
    };
  }

  let sentKeyId = `${Date.now()}-${correctedMessage.id}`;
  try {
    const options: any = { quoted: quotedMsgKey ? { key: quotedMsgKey, message: {} } : undefined };
    if (correctedMessage.mediaType !== "chat" && correctedMessage.mediaName) {
      const customPath = join(__dirname, "..", "..", "..", "public");
      let mediaPath = join(customPath, correctedMessage.mediaName);
      if (correctedMessage.mediaType === "audio") {
        mediaPath = await ConvertAudioToOpus(mediaPath);
      }
      const buffer = await readFile(mediaPath);
      let result: any;
      if (correctedMessage.mediaType === "image") {
        result = await wbot.sock.sendMessage(jid, { image: buffer }, options);
      } else if (correctedMessage.mediaType === "video") {
        result = await wbot.sock.sendMessage(jid, { video: buffer }, options);
      } else if (correctedMessage.mediaType === "audio") {
        result = await wbot.sock.sendMessage(jid, { audio: buffer, mimetype: "audio/ogg" }, options);
      } else {
        result = await wbot.sock.sendMessage(jid, { document: buffer, mimetype: "application/octet-stream", fileName: correctedMessage.mediaName }, options);
      }
      if (result?.key?.id) sentKeyId = result.key.id;
    } else {
      const result = await wbot.sock.sendMessage(jid, { text: correctedMessage.body }, options);
      if (result?.key?.id) sentKeyId = result.key.id;
    }
  } catch (sendError: any) {
    const errorMessage = sendError?.message?.toLowerCase() || "";
    if (
      errorMessage.includes("target closed") ||
      errorMessage.includes("protocol error") ||
      errorMessage.includes("session closed") ||
      errorMessage.includes("cannot read properties of undefined")
    ) {
      logger.error(`SendMessage: Erro de conexão ao enviar mensagem ${message.id}: ${sendError.message}`);
      throw new Error("ERR_WAPP_NOT_READY");
    }
    throw sendError;
  }

  await Message.update(
    { messageId: sentKeyId, status: "sended", ack: 1 },
    { where: { id: correctedMessage.id } }
  );
  logger.info("rabbit::sendedMessage", sentKeyId);

  const messageUpdated = await Message.findByPk(correctedMessage.id, {
    include: [
      { model: Ticket, as: "ticket", attributes: ["id", "tenantId"] },
      { model: Message, as: "quotedMsg", include: ["contact"] },
      "contact"
    ]
  });
  if (messageUpdated?.ticket) {
    const io = getIO();
    io.emit(`${messageUpdated.ticket.tenantId}:appMessage`, {
      action: "update",
      message: { id: messageUpdated.id, ack: 1, updatedAt: new Date() },
      ticketId: messageUpdated.ticket.id
    });
    socketEmit({
      tenantId: messageUpdated.ticket.tenantId,
      type: "chat:ack",
      payload: messageUpdated
    });
  }
};

export default SendMessage;
