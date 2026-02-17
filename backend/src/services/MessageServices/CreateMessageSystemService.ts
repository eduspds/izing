/* eslint-disable prefer-destructuring */
import fs from "fs";
// import { promisify } from "util";
import { join } from "path";
import axios from "axios";
import mime from "mime";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger";
// import MessageOffLine from "../../models/MessageOffLine";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import socketEmit from "../../helpers/socketEmit";
import Queue from "../../libs/Queue";
import { pupa } from "../../utils/pupa";
import SendWhatsAppMedia from "../WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import { getInstaBot } from "../../libs/InstaBot";
import InstagramSendMessagesSystem from "../InstagramBotServices/InstagramSendMessagesSystem";
import TelegramSendMessagesSystem from "../TbotServices/TelegramSendMessagesSystem";
import { getTbot } from "../../libs/tbot";
import SendMessageSystemProxy from "../../helpers/SendMessageSystemProxy";
import AppError from "../../errors/AppError";

interface MessageData {
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  mediaName?: string;
  originalName?: string;
  timestamp?: number;
  internalId?: string;
  userId?: string | number;
  quotedMsgId?: string;
  quotedMsg?: any;
  // status?: string;
  scheduleDate?: string | Date;
  sendType?: string;
  status?: string;
  idFront?: string;
  id?: string;
  tenantId: string | number;
}

interface MessageRequest {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
}

interface Request {
  msg: MessageRequest | any;
  scheduleDate?: string | Date;
  sendType: string;
  status: string;
  tenantId: string | number;
  medias?: Express.Multer.File[];
  ticket: Ticket;
  userId?: number | string;
  idFront?: string;
  userProfile?: string;
}

// const writeFileAsync = promisify(writeFile);

const downloadMedia = async (msg: any): Promise<any> => {
  try {
    const request = await axios.get(msg.mediaUrl, {
      responseType: "stream"
    });
    const cType = request.headers["content-type"];
    const tMine: any = mime;
    const fileExt = tMine.extension(cType);
    const mediaName = uuidv4();
    const dir = join(__dirname, "..", "..", "..", "public");
    const fileName = `${mediaName}.${fileExt}`;
    const mediaPath = join(dir, fileName);
    const mediaData = {
      originalname: fileName,
      filename: fileName,
      mediaType: fileExt
    };
    await new Promise((resolve, reject) => {
      request.data
        .pipe(fs.createWriteStream(mediaPath))
        .on("finish", async () => {
          resolve(mediaData);
        })
        .on("error", (error: any) => {
          console.error("ERROR DONWLOAD", error);
          fs.rmdirSync(mediaPath, { recursive: true });
          reject(new Error(error));
        });
    });
    return mediaData;
  } catch (error) {
    if (error.response.status === 404) {
      const payload = {
        ack: -1,
        body: msg.body,
        messageId: "",
        number: msg.number,
        externalKey: msg.externalKey,
        error: error.message,
        authToken: msg.apiConfig.authToken,
        type: "hookMessageStatus"
      };
      if (msg?.apiConfig?.urlMessageStatus) {
        Queue.add("WebHooksAPI", {
          url: msg.apiConfig.urlMessageStatus,
          type: payload.type,
          payload
        });
      }
      return {};
    }
    throw new Error(error);
  }
};

const CreateMessageSystemService = async ({
  msg,
  tenantId,
  medias,
  ticket,
  userId,
  scheduleDate,
  sendType,
  status,
  idFront,
  userProfile
}: Request): Promise<void> => {
  // Verificar se ticket está em modo sigiloso e se outro usuário está usando
  if (ticket.isConfidential && userId) {
    const isAdmin = userProfile === "admin";
    const isConfidentialUser = ticket.confidentialUserId === Number(userId);
    
    // Se não é admin e não é o autor do sigilo, bloquear envio de mensagens
    if (!isAdmin && !isConfidentialUser) {
      throw new AppError("ERR_TICKET_CONFIDENTIAL_IN_USE", 403);
    }
  }
  const messageData: MessageData = {
    ticketId: ticket.id,
    body: Array.isArray(msg.body) ? undefined : msg.body,
    contactId: ticket.contactId,
    fromMe: sendType === "API" ? true : msg?.fromMe,
    read: true,
    mediaType: "chat",
    mediaUrl: undefined,
    mediaName: undefined,
    originalName: undefined,
    timestamp: new Date().getTime(),
    quotedMsgId: msg?.quotedMsg?.id,
    quotedMsg: msg?.quotedMsg,
    userId,
    scheduleDate,
    sendType,
    status,
    tenantId,
    idFront
  };

  try {
    // Alter template message
    if (msg.body && !Array.isArray(msg.body)) {
      messageData.body = pupa(msg.body || "", {
        // greeting: será considerado conforme data/hora da mensagem internamente na função pupa
        protocol: ticket.protocol,
        name: ticket.contact.name
      });
    }
    // Não enviar mensagem de texto vazia (evita "mensagem vazia" ao reabrir ticket / fluxo com step sem texto)
    if (!medias || medias.length === 0) {
      const bodyStr = messageData.body != null ? String(messageData.body).trim() : "";
      if (bodyStr === "") {
        return;
      }
    }
    if (sendType === "API" && msg.mediaUrl) {
      medias = [];
      const mediaData = await downloadMedia(msg);
      medias.push(mediaData);
    }

    if (sendType === "API" && !msg.mediaUrl && msg.media) {
      medias = [];
      medias.push(msg.media);
    }

    if (medias && medias.length > 0) {
      // Processar mídias em sequência para evitar conflito em ticket.update/reload e garantir resposta estável
      for (const media of medias) {
        const mediaFile = media as Express.Multer.File | any;
        if (!mediaFile.filename) {
          const ext = mediaFile.mimetype?.split("/")[1]?.split(";")[0] || "bin";
          mediaFile.filename = `${new Date().getTime()}.${ext}`;
        }

        messageData.mediaType = mediaFile.mimetype?.split("/")[0] || "document";
        messageData.mediaName = mediaFile.filename;
        messageData.originalName = mediaFile.originalname;

        let message: any = {};

        if (!messageData.scheduleDate) {
          message = await SendMessageSystemProxy({
            ticket,
            messageData,
            media: mediaFile,
            userId
          });
        }

        const isConfidential = ticket.isConfidential || false;
        const confidentialUserId = ticket.confidentialUserId || null;
        const sentId = message?.key?.id || message?.id?.id || message?.id || message?.messageId || null;

        const msgCreated = await Message.create({
          ...messageData,
          id: typeof messageData.id === "string" ? messageData.id : undefined,
          userId,
          messageId: sentId,
          body: mediaFile.originalname,
          mediaUrl: mediaFile.filename,
          mediaType:
            mediaFile.mediaType ||
            (mediaFile.mimetype ? mediaFile.mimetype.substr(0, mediaFile.mimetype.indexOf("/")) : "document"),
          isConfidential,
          confidentialUserId,
          ack: sentId ? 1 : 0,
          status: sentId ? "sended" : messageData.status || "pending"
        });

        const messageCreated = await Message.findByPk(msgCreated.id, {
          include: [
            {
              model: Ticket,
              as: "ticket",
              where: { tenantId },
              include: ["contact"]
            },
            {
              model: Message,
              as: "quotedMsg",
              include: ["contact"]
            }
          ]
        });

        if (!messageCreated) {
          throw new Error("ERR_CREATING_MESSAGE_SYSTEM");
        }

        await ticket.update({
          lastMessage: messageCreated.body,
          lastMessageAt: new Date().getTime(),
          updatedAt: new Date()
        });
        await ticket.reload();

        const serializedMessage = messageCreated.toJSON() as any;
        if (!serializedMessage.ticket && messageCreated.ticketId) {
          const ticketForPayload = await Ticket.findOne({
            where: { id: messageCreated.ticketId, tenantId },
            include: ["contact"]
          });
          if (ticketForPayload) serializedMessage.ticket = ticketForPayload.toJSON();
        }

        socketEmit({
          tenantId,
          type: "chat:create",
          payload: serializedMessage
        });
        socketEmit({
          tenantId,
          type: "ticket:update",
          payload: ticket
        });
      }
    } else {
      let message: any = {};

      if (!messageData.scheduleDate) {
        /// enviar mensagem > run time
        message = await SendMessageSystemProxy({
          ticket,
          messageData,
          media: null,
          userId
        });
        ///
      }

      // Verificar se ticket tem sigilo ativo
      const isConfidential = ticket.isConfidential || false;
      const confidentialUserId = ticket.confidentialUserId || null;

      const sentId = message.key?.id || message.id?.id || message.id || message.messageId || null;
      const msgCreated = await Message.create({
        ...messageData,
        id: typeof messageData.id === "string" ? messageData.id : undefined,
        userId,
        messageId: sentId,
        mediaType: "chat",
        isConfidential,
        confidentialUserId,
        ack: sentId ? 1 : 0,
        status: sentId ? "sended" : messageData.status || "pending"
      });

      const messageCreated = await Message.findByPk(msgCreated.id, {
        include: [
          {
            model: Ticket,
            as: "ticket",
            where: { tenantId },
            include: ["contact"]
          },
          {
            model: Message,
            as: "quotedMsg",
            include: ["contact"]
          }
        ]
      });

      if (!messageCreated) {
        // throw new AppError("ERR_CREATING_MESSAGE", 501);
        throw new Error("ERR_CREATING_MESSAGE_SYSTEM");
      }

      await ticket.update({
        lastMessage: messageCreated.body,
        lastMessageAt: new Date().getTime(),
        answered: true,
        updatedAt: new Date() // Atualizar updatedAt para que o ticket suba para o topo
      });

      // Recarregar o ticket para obter os dados atualizados
      await ticket.reload();

      // Forçar serialização para chamar os getters (mediaUrl)
      const serializedMessage = messageCreated.toJSON();

      socketEmit({
        tenantId,
        type: "chat:create",
        payload: serializedMessage
      });

      // Emitir evento de atualização do ticket para que ele suba para o topo
      socketEmit({
        tenantId,
        type: "ticket:update",
        payload: ticket
      });
    }
  } catch (error) {
    logger.error("CreateMessageSystemService", error);
    throw error;
  }
};

export default CreateMessageSystemService;
