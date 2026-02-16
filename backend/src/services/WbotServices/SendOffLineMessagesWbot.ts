import { join } from "path";
import { readFile } from "fs/promises";
import type { BaileysSession } from "../../types/baileysAdapter";
import { toBaileysJid } from "../../types/baileysAdapter";
import Message from "../../models/Message";
import MessagesOffLine from "../../models/MessageOffLine";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import { getIO } from "../../libs/socket";
import UserMessagesLog from "../../models/UserMessagesLog";
import ConvertAudioToOpus from "../../helpers/ConvertAudioToOpus";

const SendOffLineMessagesWbot = async (
  wbot: BaileysSession,
  tenantId: number | string
): Promise<void> => {
  const messages = await MessagesOffLine.findAll({
    include: [
      "contact",
      { model: Ticket, as: "ticket", where: { tenantId }, include: ["contact"] },
      { model: Message, as: "quotedMsg", include: ["contact"] }
    ],
    order: [["updatedAt", "ASC"]]
  });
  const io = getIO();
  await Promise.all(
    messages.map(async message => {
      logger.info(`Send Message OffLine: ${message.id}`);
      try {
        if (message.mediaType !== "chat" && message.mediaName) {
          const customPath = join(__dirname, "..", "..", "..", "public");
          let mediaPath = join(
            process.env.PATH_OFFLINE_MEDIA || customPath,
            message.mediaName
          );
          if (message.mediaType === "audio") {
            mediaPath = await ConvertAudioToOpus(mediaPath);
          }
          const buffer = await readFile(mediaPath);
          const jid = toBaileysJid(message.ticket.contact.number, message.ticket.isGroup);
          const result = await wbot.sock.sendMessage(jid, {
            audio: buffer,
            mimetype: "audio/ogg"
          });
          if (message.userId && result?.key?.id) {
            await UserMessagesLog.create({
              messageId: result.key.id,
              userId: message.userId,
              ticketId: message.ticketId
            });
          }
        } else {
          await SendWhatsAppMessage({
            body: message.body,
            ticket: message.ticket,
            quotedMsg: message.quotedMsg,
            userId: message.userId
          });
        }
        await MessagesOffLine.destroy({ where: { id: message.id } });
        io.to(`${tenantId}-${message.ticketId.toString()}`).emit(
          `${tenantId}-appMessage`,
          { action: "delete", message }
        );
      } catch (error) {
        logger.error(`Error enviar messageOffLine: ${error}`);
      }
    })
  );
};

export default SendOffLineMessagesWbot;
