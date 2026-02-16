import MessageReadReceipt from "../../models/MessageReadReceipt";
import InternalMessage from "../../models/InternalMessage";
import InternalGroup from "../../models/InternalGroup";
import User from "../../models/User";
import AppError from "../../errors/AppError";
import socketEmit from "../../helpers/socketEmit";

interface Request {
  messageId: number;
  userId: number;
  tenantId: number;
}

/**
 * Service para marcar mensagem de grupo como lida por um usuário específico
 */
const MarkMessageAsReadByUserService = async ({
  messageId,
  userId,
  tenantId
}: Request): Promise<void> => {
  // Buscar mensagem
  const message = await InternalMessage.findOne({
    where: { id: messageId, tenantId },
    include: [
      {
        model: InternalGroup,
        as: "group",
        include: ["members"]
      }
    ]
  });

  if (!message) {
    throw new AppError("ERR_MESSAGE_NOT_FOUND", 404);
  }

  // Apenas para mensagens de grupo
  if (!message.groupId) {
    throw new AppError("ERR_NOT_GROUP_MESSAGE", 400);
  }

  // Não marcar própria mensagem
  if (message.senderId === userId) {
    return;
  }

  // Verificar se já foi marcada como lida por este usuário
  const existing = await MessageReadReceipt.findOne({
    where: {
      messageId,
      userId
    }
  });

  if (existing) {
    return; // Já marcou como lida
  }

  // Criar registro de leitura
  await MessageReadReceipt.create({
    messageId,
    userId,
    readAt: new Date()
  });

  // Buscar todos os registros de leitura desta mensagem
  const readReceipts = await MessageReadReceipt.findAll({
    where: { messageId },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      }
    ]
  });

  // Verificar se todos viram (excluindo o remetente)
  const totalMembers = message.group.members?.length - 1 || 0;
  const readCount = readReceipts.length;
  const allRead = readCount >= totalMembers;

  // Emitir evento WebSocket para atualizar status de leitura
  socketEmit({
    tenantId,
    type: "internalChat:update",
    payload: {
      action: "groupMessageRead",
      messageId,
      userId,
      userName: readReceipts.find(r => r.userId === userId)?.user.name,
      readBy: readReceipts.map(r => ({
        userId: r.userId,
        userName: r.user.name,
        readAt: r.readAt
      })),
      allRead,
      groupId: message.groupId
    }
  });
};

export default MarkMessageAsReadByUserService;

