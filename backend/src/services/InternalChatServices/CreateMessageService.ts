import InternalMessage from "../../models/InternalMessage";
import User from "../../models/User";
import InternalGroup from "../../models/InternalGroup";
import AppError from "../../errors/AppError";
import socketEmit from "../../helpers/socketEmit";
import { logger } from "../../utils/logger";

interface CreateMessageRequest {
  senderId: number;
  recipientId?: number;
  groupId?: number;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaName?: string;
  quotedMessageId?: number;
  tenantId: number | string;
}

const CreateMessageService = async ({
  senderId,
  recipientId,
  groupId,
  message,
  mediaUrl,
  mediaType,
  mediaName,
  quotedMessageId,
  tenantId
}: CreateMessageRequest): Promise<InternalMessage> => {
  // Validação: deve ter recipientId OU groupId, não ambos
  if (!recipientId && !groupId) {
    throw new AppError("Recipient or Group is required");
  }

  if (recipientId && groupId) {
    throw new AppError("Message cannot have both recipient and group");
  }

  // Verificar se remetente existe
  const sender = await User.findByPk(senderId);
  if (!sender) {
    throw new AppError("Sender not found");
  }

  // Se for mensagem privada, verificar se destinatário existe
  if (recipientId) {
    const recipient = await User.findByPk(recipientId);
    if (!recipient) {
      throw new AppError("Recipient not found");
    }

    // Não permitir enviar mensagem para si mesmo
    if (senderId === recipientId) {
      throw new AppError("Cannot send message to yourself");
    }
  }

  // Se for mensagem de grupo, verificar se grupo existe e usuário é membro
  if (groupId) {
    const group = await InternalGroup.findByPk(groupId);
    if (!group) {
      throw new AppError("Group not found");
    }

    // Verificar se usuário é membro do grupo
    const InternalGroupMember = (
      await import("../../models/InternalGroupMember")
    ).default;
    const member = await InternalGroupMember.findOne({
      where: {
        userId: senderId,
        groupId,
        isActive: true
      }
    });

    if (!member) {
      throw new AppError("User is not a member of this group");
    }
  }

  // Criar mensagem
  const newMessage = await InternalMessage.create({
    senderId,
    recipientId,
    groupId,
    message,
    mediaUrl,
    mediaType,
    mediaName,
    quotedMessageId,
    tenantId: Number(tenantId),
    isRead: false,
    isEdited: false,
    isDeleted: false
  });

  // Recarregar com relacionamentos
  await newMessage.reload({
    include: [
      { association: "sender", attributes: ["id", "name", "email"] },
      { association: "recipient", attributes: ["id", "name", "email"] },
      { association: "group", attributes: ["id", "name"] },
      { association: "quotedMessage" }
    ]
  });
  logger.info(`[CreateMessageService] Mensagem criada: ${newMessage}`);
  console.log(`[CreateMessageService] Mensagem criada: ${newMessage}`);
  // Emitir evento via WebSocket usando helper
  socketEmit({
    tenantId: Number(tenantId),
    type: "internalChat:message",
    payload: newMessage
  });

  return newMessage;
};

export default CreateMessageService;
