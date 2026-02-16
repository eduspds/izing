import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import socketEmit from "../../helpers/socketEmit";

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
  // Buscar ticket para verificar se está em modo sigiloso
  // Recarregar ticket para garantir dados atualizados
  const ticket = await Ticket.findOne({
    where: { id: messageData.ticketId, tenantId }
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
    where: { messageId: messageData.messageId, tenantId }
  });
  if (!msg) {
    await Message.create({
      ...messageData,
      tenantId,
      isConfidential,
      confidentialUserId
    });
  } else {
    await msg.update({
      ...messageData,
      isConfidential,
      confidentialUserId
    });
  }
  const message = await Message.findOne({
    where: { messageId: messageData.messageId, tenantId },
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
  const serializedMessage = message.toJSON();

  socketEmit({
    tenantId,
    type: "chat:create",
    payload: serializedMessage
  });

  return message;
};

export default CreateMessageService;
