import { join } from "path";
import { promisify } from "util";
import { writeFile } from "fs";
import type { IBaileysMessageAdapter } from "../../../types/baileysAdapter";
import Contact from "../../../models/Contact";
import Ticket from "../../../models/Ticket";
import Message from "../../../models/Message";
import VerifyQuotedMessage from "./VerifyQuotedMessage";
import CreateMessageService from "../../MessageServices/CreateMessageService";
import { logger } from "../../../utils/logger";

const writeFileAsync = promisify(writeFile);

const VerifyMediaMessage = async (
  msg: IBaileysMessageAdapter,
  ticket: Ticket,
  contact: Contact
): Promise<Message | void> => {
  const quotedMsg = await VerifyQuotedMessage(msg);

  const media = await msg.downloadMedia();
  if (!media) {
    logger.error(`ERR_WAPP_DOWNLOAD_MEDIA:: ID: ${msg.id.id}`);
    return;
  }

  let filename = media.filename;
  if (!filename) {
    const ext = media.mimetype.split("/")[1]?.split(";")[0] ?? "bin";
    filename = `${new Date().getTime()}.${ext}`;
  }

  try {
    const publicPath = join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "public"
    );
    await writeFileAsync(
      join(publicPath, filename),
      Buffer.isBuffer(media.data) ? media.data : Buffer.from(media.data as any, "base64")
    );
  } catch (error) {
    logger.error(
      `VerifyMediaMessage: Erro ao processar mídia | messageId=${msg.id.id} error=${(error as Error).message}`,
      { ticketId: ticket.id, contactId: contact.id, tenantId: ticket.tenantId }
    );
    throw new Error(`ERR_WAPP_DOWNLOAD_MEDIA:: ID: ${msg.id.id}`);
  }

  const messageData = {
    messageId: msg.id.id,
    ticketId: ticket.id,
    contactId: msg.fromMe ? undefined : contact.id,
    body: msg.body || filename,
    fromMe: msg.fromMe,
    read: msg.fromMe,
    mediaUrl: filename,
    mediaType: media.mimetype.split("/")[0],
    quotedMsgId: quotedMsg?.id,
    timestamp: msg.timestamp,
    status: msg.fromMe ? "sended" : "received"
  };

  await ticket.update({
    lastMessage: msg.body || filename,
    lastMessageAt: new Date().getTime(),
    answered: msg.fromMe || false
  });
  const newMessage = await CreateMessageService({
    messageData,
    tenantId: ticket.tenantId
  });

  return newMessage;
};

export default VerifyMediaMessage;
