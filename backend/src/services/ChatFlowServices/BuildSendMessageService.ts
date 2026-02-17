import { join } from "path";
import { pupa } from "../../utils/pupa";
import { logger } from "../../utils/logger";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import socketEmit from "../../helpers/socketEmit";
import SendMessageSystemProxy from "../../helpers/SendMessageSystemProxy";

/** Até 3 botões para mensagem interativa (Baileys) */
export interface ChatFlowButtonPayload {
  buttonId: string;
  buttonText: { displayText: string };
  type: number;
}

interface MessageData {
  id?: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  timestamp?: number;
  internalId?: string;
  userId?: string | number;
  tenantId: string | number;
  quotedMsgId?: string;
  scheduleDate?: string | Date;
  sendType?: string;
  status?: string;
  /** Envio de botões clicáveis (WhatsApp). Máx. 3. */
  buttons?: ChatFlowButtonPayload[];
}

interface MessageRequest {
  data: {
    message?: string;
    values?: string[];
    caption?: string;
    ext?: string;
    mediaUrl?: string;
    name?: string;
    type?: string;
  };
  id: string;
  type: "MessageField" | "MessageOptionsField" | "MediaField";
}

interface Request {
  msg: MessageRequest;
  tenantId: string | number;
  ticket: Ticket;
  userId?: number | string;
}

// const writeFileAsync = promisify(writeFile);

const BuildSendMessageService = async ({
  msg,
  tenantId,
  ticket,
  userId
}: Request): Promise<void> => {
  logger.info("[BuildSendMessageService] Início msg.type=" + (msg?.type || "?") + " ticketId=" + ticket?.id);
  const messageData: MessageData = {
    ticketId: ticket.id,
    body: "",
    contactId: ticket.contactId,
    fromMe: true,
    read: true,
    mediaType: "chat",
    mediaUrl: undefined,
    timestamp: new Date().getTime(),
    quotedMsgId: undefined,
    userId,
    scheduleDate: undefined,
    sendType: "bot",
    status: "pending",
    tenantId
  };

  try {
    if (msg.type === "MediaField" && msg.data.mediaUrl) {
      const urlSplit = msg.data.mediaUrl.split("/");

      const message = {
        ...messageData,
        body: msg.data.name,
        mediaName: urlSplit[urlSplit.length - 1],
        mediaUrl: urlSplit[urlSplit.length - 1],
        mediaType: msg.data.type
          ? msg.data?.type.substr(0, msg.data.type.indexOf("/"))
          : "chat"
      };

      const customPath = join(__dirname, "..", "..", "..", "public");
      const mediaPath = join(customPath, message.mediaUrl);

      const media = {
        path: mediaPath,
        filename: message.mediaName
      };

      const messageSent = await SendMessageSystemProxy({
        ticket,
        messageData: message,
        media,
        userId
      });

      const msgCreated = await Message.create({
        ...message,
        ...messageSent,
        id: messageData.id,
        messageId: messageSent.id?.id || messageSent.messageId || null
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
        answered: true
      });
      await ticket.reload();
      socketEmit({ tenantId, type: "ticket:update", payload: ticket });

      // Forçar serialização para chamar os getters (mediaUrl)
      const serializedMessage1 = messageCreated.toJSON();
      
      socketEmit({
        tenantId,
        type: "chat:create",
        payload: serializedMessage1
      });
    } else if (msg.type === "MessageOptionsField" && msg.data) {
      const text = pupa(msg.data.message || "", {
        protocol: ticket.protocol,
        name: ticket.contact?.name ?? "",
        email: ticket.contact?.email ?? ""
      });
      const values = Array.isArray(msg.data.values) ? msg.data.values.filter((v: string) => v && String(v).trim()) : [];
      const maxButtons = 3;
      const buttonsSlice = values.slice(0, maxButtons);
      const bodyFallback =
        text +
        (buttonsSlice.length > 0
          ? `\n\n${buttonsSlice.map((v: string, i: number) => `${i + 1}. ${v}`).join("\n")}`
          : "");
      const body = (bodyFallback || text || "").trim();
      if (!body) {
        return;
      }

      const buttons: ChatFlowButtonPayload[] =
        buttonsSlice.length > 0
          ? buttonsSlice.map((v: string, i: number) => ({
              buttonId: `opt_${i}`,
              buttonText: { displayText: String(v).trim() },
              type: 1
            }))
          : [];
      const sendWithButtons = buttons.length > 0 && process.env.BOT_CHATFLOW_TEXT_ONLY !== "true";

      const messageSent = await SendMessageSystemProxy({
        ticket,
        messageData: {
          ...messageData,
          body,
          ...(sendWithButtons ? { buttons } : {})
        },
        media: null,
        userId: null
      });

      const msgCreated = await Message.create({
        ...messageData,
        body,
        messageId: (messageSent as any)?.key?.id || (messageSent as any)?.messageId || null,
        mediaType: "bot"
      });

      const messageCreated = await Message.findByPk(msgCreated.id, {
        include: [
          { model: Ticket, as: "ticket", where: { tenantId }, include: ["contact"] },
          { model: Message, as: "quotedMsg", include: ["contact"] }
        ]
      });

      if (!messageCreated) throw new Error("ERR_CREATING_MESSAGE_SYSTEM");

      const sentId = (messageSent as any)?.key?.id || (messageSent as any)?.messageId;
      if (sentId) {
        await Message.update(
          { messageId: sentId, status: "sended", ack: 1 },
          { where: { id: messageCreated.id } }
        );
        (messageCreated as any).messageId = sentId;
        (messageCreated as any).status = "sended";
        (messageCreated as any).ack = 1;
      }

      await ticket.update({
        lastMessage: messageCreated.body,
        lastMessageAt: new Date().getTime(),
        answered: true
      });
      await ticket.reload();
      socketEmit({ tenantId, type: "ticket:update", payload: ticket });

      const serialized = messageCreated.toJSON();
      socketEmit({ tenantId, type: "chat:create", payload: serialized });
    } else {
      // Alter template message
      const text = pupa(msg.data?.message || "", {
        protocol: ticket.protocol,
        name: ticket.contact?.name ?? "",
        email: ticket.contact?.email ?? ""
      });
      if (!text || String(text).trim() === "") {
        return;
      }
      msg.data.message = text;

      const messageSent = await SendMessageSystemProxy({
        ticket,
        messageData: {
          ...messageData,
          body: msg.data.message
        },
        media: null,
        userId: null
      });

      const msgCreated = await Message.create({
        ...messageData,
        body: msg.data.message,
        messageId: (messageSent as any)?.key?.id || (messageSent as any)?.messageId || null,
        mediaType: "bot"
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

      const sentId2 = (messageSent as any)?.key?.id || (messageSent as any)?.messageId;
      if (sentId2) {
        await Message.update(
          { messageId: sentId2, status: "sended", ack: 1 },
          { where: { id: messageCreated.id } }
        );
        (messageCreated as any).messageId = sentId2;
        (messageCreated as any).status = "sended";
        (messageCreated as any).ack = 1;
      }

      await ticket.update({
        lastMessage: messageCreated.body,
        lastMessageAt: new Date().getTime(),
        answered: true
      });
      await ticket.reload();
      socketEmit({ tenantId, type: "ticket:update", payload: ticket });

      // Forçar serialização para chamar os getters (mediaUrl)
      const serializedMessage2 = messageCreated.toJSON();
      
      socketEmit({
        tenantId,
        type: "chat:create",
        payload: serializedMessage2
      });
    }
  } catch (error) {
    logger.error("BuildSendMessageService", error);
    if (error instanceof Error) {
      logger.error("BuildSendMessageService stack: " + error.stack);
    }
  }
};

export default BuildSendMessageService;
