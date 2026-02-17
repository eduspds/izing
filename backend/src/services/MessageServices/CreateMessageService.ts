import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import socketEmit from "../../helpers/socketEmit";
import { logger } from "../../utils/logger";

interface MessageData {
  id?: string;
  messageId: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  timestamp?: number;
}
interface Request {
  messageData: MessageData;
  tenantId: string | number;
}

const CreateMessageService = async ({
  messageData,
  tenantId
}: Request): Promise<Message> => {
  const messageId = String(messageData.messageId ?? "").trim();
  if (!messageId) {
    logger.warn("[CreateMessageService] messageId vazio, ignorando criação");
    throw new Error("ERR_MESSAGE_ID_REQUIRED");
  }
  const normalizedMessageData = { ...messageData, messageId };

  // Buscar ticket para verificar se está em modo sigiloso
  const ticket = await Ticket.findOne({
    where: { id: normalizedMessageData.ticketId, tenantId }
  });

  if (!ticket) {
    throw new Error("ERR_TICKET_NOT_FOUND");
  }

  // Recarregar ticket para garantir dados atualizados de sigilo
  await ticket.reload();

  // Se ticket está em modo sigiloso, marcar mensagem como sigilosa
  let isConfidential = false;
  let confidentialUserId: number | null = null;
  if (ticket.isConfidential) {
    isConfidential = true;
    confidentialUserId = ticket.confidentialUserId;
  }

  const msg = await Message.findOne({
    where: { messageId: normalizedMessageData.messageId, tenantId }
  });
  if (!msg) {
    await Message.create({
      ...normalizedMessageData,
      tenantId,
      isConfidential,
      confidentialUserId
    });
  } else {
    await msg.update({
      ...normalizedMessageData,
      isConfidential,
      confidentialUserId
    });
  }
  const message = await Message.findOne({
    where: { messageId: normalizedMessageData.messageId, tenantId },
    include: [
      "contact",
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

  if (!message) {
    // throw new AppError("ERR_CREATING_MESSAGE", 501);
    throw new Error("ERR_CREATING_MESSAGE");
  }

  // Forçar serialização para chamar os getters (mediaUrl)
  const serializedMessage = message.toJSON() as any;
  // Garantir que o frontend sempre receba o ticket (evita payload sem ticket e mensagem não exibida)
  if (!serializedMessage.ticket && message.ticketId) {
    const ticketForPayload = await Ticket.findOne({
      where: { id: message.ticketId, tenantId },
      include: ["contact"]
    });
    if (ticketForPayload) serializedMessage.ticket = ticketForPayload.toJSON();
  }

  const fromMe = Boolean(serializedMessage.fromMe);
  logger.info(
    `[CreateMessageService] Emitindo chat:create | ticketId=${normalizedMessageData.ticketId} messageId=${normalizedMessageData.messageId} fromMe=${fromMe} tenantId=${tenantId} ts=${Date.now()}`
  );
  socketEmit({
    tenantId,
    type: "chat:create",
    payload: serializedMessage
  });

  return message;
};

export default CreateMessageService;
