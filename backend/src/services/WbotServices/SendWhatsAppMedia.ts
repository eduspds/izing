import { readFile } from "fs/promises";
import type { BaileysSession } from "../../types/baileysAdapter";
import { toBaileysJid } from "../../types/baileysAdapter";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import ConvertAudioToOpus from "../../helpers/ConvertAudioToOpus";
import Ticket from "../../models/Ticket";
import UserMessagesLog from "../../models/UserMessagesLog";
import { logger } from "../../utils/logger";
import { StartWhatsAppSessionVerify } from "./StartWhatsAppSessionVerify";
import { enqueueSend } from "../../helpers/SendQueue";
import mime from "mime-types";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  userId: number | string | undefined;
  keepFile?: boolean;
}

function isTransientError(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("evaluation failed") ||
    msg.includes("getchat") ||
    msg.includes("execution context was destroyed") ||
    msg.includes("target closed") ||
    msg.includes("protocol error") ||
    msg.includes("err_wapp_check_contact") ||
    msg.includes("err_wapp_not_connected") ||
    msg.includes("no lid for user") ||
    msg.includes("markedunread")
  );
}

async function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  userId,
  keepFile = true
}: Request): Promise<{ key: { id: string } }> => {
  try {
    if (!ticket.contact?.number) throw new AppError("ERR_NO_CONTACT_NUMBER");

    const task = async (): Promise<{ key: { id: string } }> => {
      const wbot = await GetTicketWbot(ticket) as BaileysSession;
      await delay(500);

      let mediaPath = media.path;
      if (media.mimetype?.toLowerCase().startsWith("audio/")) {
        try {
          mediaPath = await ConvertAudioToOpus(media.path);
        } catch (convertError) {
          logger.warn(`Erro ao converter áudio, usando original: ${convertError}`);
          mediaPath = media.path;
        }
      }

      const buffer = await readFile(mediaPath);
      const contactNumber = ticket.contact.number;
      let jid = toBaileysJid(contactNumber, ticket.isGroup);

      const detectedMime = (media as any)?.mimetype || (mime.lookup(media.path) || "");
      const isVoice = /audio\/opus/i.test(String(detectedMime)) || mediaPath.toLowerCase().endsWith(".opus");

      logger.info(
        `SendWhatsAppMedia: Enviando mídia | Tipo: ${detectedMime} | IsVoice: ${isVoice} | Arquivo: ${media.filename}`
      );

      try {
        let result: any;
        if (/^image\//.test(detectedMime)) {
          result = await wbot.sock.sendMessage(jid, { image: buffer });
        } else if (/^video\//.test(detectedMime)) {
          result = await wbot.sock.sendMessage(jid, { video: buffer });
        } else if (/^audio\//.test(detectedMime) || isVoice) {
          result = await wbot.sock.sendMessage(jid, { audio: buffer, mimetype: detectedMime || "audio/ogg" });
        } else {
          result = await wbot.sock.sendMessage(jid, { document: buffer, mimetype: "application/octet-stream", fileName: media.filename });
        }

        await ticket.update({ lastMessage: media.filename, lastMessageAt: new Date().getTime() });
        if (userId && result?.key?.id) {
          await UserMessagesLog.create({ messageId: result.key.id, userId, ticketId: ticket.id });
        }
        logger.info(`SendWhatsAppMedia: Mídia enviada | Ticket: ${ticket.id} | Arquivo: ${media.filename}`);
        return result ? { key: { id: result.key?.id ?? "" } } : { key: { id: "" } };
      } catch (sendError: any) {
        const errorMsg = String(sendError?.message || sendError).toLowerCase();
        if (errorMsg.includes("no lid for user")) {
          const fallbackJid = jid.endsWith("@lid")
            ? `${contactNumber.replace(/\D/g, "")}@s.whatsapp.net`
            : `${contactNumber.replace(/\D/g, "")}@lid`;
          const result = await wbot.sock.sendMessage(fallbackJid, { document: buffer, mimetype: "application/octet-stream", fileName: media.filename });
          return result ? { key: { id: result.key?.id ?? "" } } : { key: { id: "" } };
        }
        throw sendError;
      }
    };

    return await enqueueSend(ticket.whatsappId, task);
  } catch (err: any) {
    if (err?.message && String(err.message).includes("serialize")) {
      logger.error(`WhatsApp instability detected for ${ticket.contact?.number}`);
      throw new AppError("ERR_WAPP_SERIALIZE_INSTABILITY");
    }
    logger.error(`SendWhatsAppMedia | Error: ${err?.message || err}`, {
      stack: err?.stack,
      ticketId: ticket?.id,
      contactNumber: ticket?.contact?.number
    });
    await StartWhatsAppSessionVerify(ticket.whatsappId, err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
