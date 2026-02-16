/* eslint-disable no-await-in-loop */
import { join } from "path";
import { readFile } from "fs/promises";
import { Op } from "sequelize";
import type { BaileysSession } from "../../types/baileysAdapter";
import { toBaileysJid } from "../../types/baileysAdapter";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import { sleepRandomTime } from "../../utils/sleepRandomTime";
import Contact from "../../models/Contact";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import ConvertAudioToOpus from "../../helpers/ConvertAudioToOpus";
import { whatsAppManager } from "../../libs/wbot";
import socketEmit from "../../helpers/socketEmit";

const BATCH_SIZE = parseInt(process.env.MESSAGE_BATCH_SIZE || "20", 10);
const BATCH_DELAY_MS = parseInt(process.env.BATCH_DELAY_MS || "1000", 10);
const MESSAGE_AGE_LIMIT_MS = 24 * 60 * 60 * 1000;

const SendMessagesSystemWbot = async (
  wbot: BaileysSession,
  tenantId: number | string
): Promise<void> => {
  const where = {
    fromMe: true,
    messageId: { [Op.is]: null },
    status: "pending",
    [Op.or]: [
      {
        scheduleDate: {
          [Op.lte]: new Date(),
          [Op.gte]: new Date(Date.now() - MESSAGE_AGE_LIMIT_MS)
        }
      },
      {
        scheduleDate: { [Op.is]: null },
        createdAt: { [Op.gte]: new Date(Date.now() - MESSAGE_AGE_LIMIT_MS) }
      }
    ]
  };

  try {
    const messages = await Message.findAll({
      where,
      limit: BATCH_SIZE,
      include: [
        { model: Contact, as: "contact", where: { tenantId, number: { [Op.notIn]: ["", "null"] } } },
        { model: Ticket, as: "ticket", where: { tenantId, channel: "whatsapp", whatsappId: wbot.id }, include: ["contact"] },
        { model: Message, as: "quotedMsg", include: ["contact"] }
      ],
      order: [["createdAt", "ASC"]]
    });

    logger.info(`[SYSTEM_WBOT] Processando ${messages.length}/${BATCH_SIZE} mensagens para tenant ${tenantId}`);

    let successCount = 0;
    let errorCount = 0;

    const isReady = await whatsAppManager.isWbotReady(wbot.id);
    if (!isReady) {
      logger.warn(`[SYSTEM_WBOT] Wbot não está pronto para sessão ${wbot.id}. Pulando.`);
      return;
    }

    for (const message of messages) {
      try {
        const stillReady = await whatsAppManager.isWbotReady(wbot.id);
        if (!stillReady) break;

        const { ticket } = message;
        const contactNumber = ticket.contact.number;
        const jid = toBaileysJid(contactNumber, ticket?.isGroup ?? false);

        let quotedKey: { remoteJid: string; id: string; fromMe: boolean } | undefined;
        if (message.quotedMsg) {
          const inCache = await GetWbotMessage(ticket, message.quotedMsg.messageId, 200);
          if (inCache?.id?._serialized) {
            quotedKey = { remoteJid: jid, id: message.quotedMsg.messageId, fromMe: message.quotedMsg.fromMe };
          }
        }

        const options: any = { quoted: quotedKey ? { key: quotedKey, message: {} } : undefined };
        let result: any;

        if (message.mediaType !== "chat" && message.mediaName) {
          const customPath = join(__dirname, "..", "..", "..", "public");
          let mediaPath = join(customPath, message.mediaName);
          if (message.mediaType === "audio") {
            mediaPath = await ConvertAudioToOpus(mediaPath);
          }
          const buffer = await readFile(mediaPath);
          if (message.mediaType === "image") {
            result = await wbot.sock.sendMessage(jid, { image: buffer }, options);
          } else if (message.mediaType === "video") {
            result = await wbot.sock.sendMessage(jid, { video: buffer }, options);
          } else if (message.mediaType === "audio") {
            result = await wbot.sock.sendMessage(jid, { audio: buffer, mimetype: "audio/ogg" }, options);
          } else {
            result = await wbot.sock.sendMessage(jid, { document: buffer, mimetype: "application/octet-stream", fileName: message.mediaName }, options);
          }
        } else {
          result = await wbot.sock.sendMessage(jid, { text: message.body }, options);
        }

        const sentKeyId = result?.key?.id || `system-${Date.now()}`;
        await Message.update(
          { messageId: sentKeyId, status: "sended", ack: 1, updatedAt: new Date() },
          { where: { id: message.id } }
        );
        const messageUpdated = await Message.findByPk(message.id, {
          include: [
            { model: Ticket, as: "ticket", attributes: ["id", "tenantId"] },
            { model: Message, as: "quotedMsg", include: ["contact"] },
            "contact"
          ]
        });
        if (messageUpdated?.ticket) {
          socketEmit({
            tenantId: messageUpdated.ticket.tenantId,
            type: "chat:ack",
            payload: messageUpdated.toJSON ? messageUpdated.toJSON() : messageUpdated
          });
        }
        successCount += 1;
        await sleepRandomTime({ minMilliseconds: 500, maxMilliseconds: 2000 });
      } catch (error: any) {
        errorCount += 1;
        const errorMessage = error?.message || "";
        if (
          errorMessage.includes("ERR_WAPP_NOT_READY") ||
          errorMessage.includes("ERR_WAPP_NOT_INITIALIZED") ||
          errorMessage.includes("target closed") ||
          errorMessage.includes("protocol error")
        ) {
          logger.warn(`[SYSTEM_WBOT] Sessão não pronta para mensagem ${message.id}. Será reenviada.`);
        } else {
          logger.error(`[SYSTEM_WBOT] Erro ao enviar mensagem ${message.id}:`, error);
          await Message.update({ status: "failed", updatedAt: new Date() }, { where: { id: message.id } });
        }
      }
    }

    logger.info(`[SYSTEM_WBOT] Concluído: ${successCount} sucessos, ${errorCount} erros`);
    if (messages.length >= BATCH_SIZE) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  } catch (error) {
    logger.error("[SYSTEM_WBOT] Erro geral:", error);
  }
};

export default SendMessagesSystemWbot;
