import { Op } from "sequelize";
import { join } from "path";
import socketEmit from "../../helpers/socketEmit";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";
import SendMessageSystemProxy from "../../helpers/SendMessageSystemProxy";

interface Request {
  message: Message;
  contact: Contact;
  userId?: number | string;
  tenantId: string | number;
  ticketIdOrigin: number;
}

// Helper para obter mimetype baseado no tipo de mídia
const getMimeType = (mediaType: string, fileName?: string): string => {
  const mimeTypes: { [key: string]: string } = {
    image: "image/jpeg",
    video: "video/mp4",
    audio: "audio/ogg",
    ptt: "audio/ogg",
    voice: "audio/ogg",
    document: "application/pdf",
    application: "application/pdf",
    sticker: "image/webp"
  };
  
  // Se tiver nome do arquivo, tentar determinar pelo extensão
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'ogg' || ext === 'opus') return "audio/ogg";
    if (ext === 'mp3') return "audio/mpeg";
    if (ext === 'wav') return "audio/wav";
    if (ext === 'mp4') return "video/mp4";
    if (ext === 'webm') return "video/webm";
    if (ext === 'jpg' || ext === 'jpeg') return "image/jpeg";
    if (ext === 'png') return "image/png";
    if (ext === 'webp') return "image/webp";
    if (ext === 'pdf') return "application/pdf";
  }
  
  return mimeTypes[mediaType] || "application/octet-stream";
};

const CreateForwardMessageService = async ({
  userId,
  tenantId,
  message,
  contact,
  ticketIdOrigin
}: Request): Promise<void> => {
  const ticketOrigin = await ShowTicketService({
    id: ticketIdOrigin,
    tenantId
  });

  let ticket: Ticket | undefined | null;
  ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending", "pending_evaluation"]
      },
      tenantId,
      contactId: contact.id
    },
    include: ["contact", "whatsapp"]
  });

  // caso não exista ticket aberto ou pendente
  if (!ticket) {
    ticket = await Ticket.create({
      contactId: contact.id,
      status: "open",
      isGroup: contact.isGroup,
      userId,
      tenantId,
      unreadMessages: 0,
      whatsappId: ticketOrigin.whatsappId,
      lastMessage: message.body,
      lastMessageAt: new Date().getTime(),
      answered: true
    });

    // Recarregar o ticket com os relacionamentos necessários
    await ticket.reload({
      include: ["contact", "whatsapp"]
    });
  }

  // preparar dados para criação da mensagem
  const msgData = {
    body: message.body,
    contactId: contact.id,
    fromMe: true,
    read: true,
    mediaType: message?.mediaType,
    mediaUrl: message?.mediaUrl,
    mediaName: message?.mediaName,
    timestamp: new Date().getTime(),
    userId,
    scheduleDate: null,
    sendType: "chat",
    status: "pending",
    ticketId: ticket.id,
    tenantId
  };

  // Enviar mensagem imediatamente
  let sentMessage: any = {};

  try {
    // Se tiver mídia, criar objeto media para o SendMessageSystemProxy
    let media: any = null;
    if (message.mediaName && message.mediaType !== "chat") {
      const customPath = join(__dirname, "..", "..", "..", "public");
      const mediaPath = join(customPath, message.mediaName);
      
      media = {
        filename: message.mediaName,
        path: mediaPath, // ✅ Caminho completo do arquivo
        mimetype: getMimeType(message.mediaType, message.mediaName),
        originalname: message.mediaName
      };
    }

    sentMessage = await SendMessageSystemProxy({
      ticket,
      messageData: msgData,
      media,
      userId
    });
  } catch (error: any) {
    console.error("Erro ao enviar mensagem de forward:", error?.message || error);
    // Continuar mesmo com erro, a mensagem ficará como pending para ser enviada depois
  }

  // Extrair apenas os dados necessários do sentMessage, excluindo o id problemático
  const { id: _, ...sentMessageData } = sentMessage;
  
  const msgCreated = await Message.create({
    ...msgData,
    ...sentMessageData,
    messageId:
      typeof sentMessage.id === "object"
        ? sentMessage.id?.id || sentMessage.id?.["_serialized"] || null
        : sentMessage.id || sentMessage.messageId || null,
    status: sentMessage.id ? "sended" : "pending"
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
};

export default CreateForwardMessageService;
