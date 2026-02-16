import { Op } from "sequelize";
import InternalMessage from "../../models/InternalMessage";
import MessageReadReceipt from "../../models/MessageReadReceipt";
import InternalGroup from "../../models/InternalGroup";
import User from "../../models/User";
import socketEmit from "../../helpers/socketEmit";

interface MarkAsReadRequest {
  userId: number;
  recipientId?: number;
  groupId?: number;
  tenantId: number | string;
}

const MarkAsReadService = async ({
  userId,
  recipientId,
  groupId,
  tenantId
}: MarkAsReadRequest): Promise<number> => {
  let whereClause: Record<string, any> = {
    tenantId,
    isRead: false,
    isDeleted: false
  };

  // Marcar como lidas as mensagens recebidas de um usuário específico
  if (recipientId) {
    whereClause = {
      ...whereClause,
      senderId: recipientId,
      recipientId: userId
    };
  }

  // Marcar como lidas as mensagens de um grupo
  if (groupId) {
    whereClause = {
      ...whereClause,
      groupId,
      senderId: { [Op.ne]: userId } // Não marcar próprias mensagens
    };
    
    // ✅ Para mensagens de grupo: criar recibos de leitura
    const unreadMessages = await InternalMessage.findAll({
      where: whereClause,
      attributes: ["id"]
    });

    if (unreadMessages.length === 0) {
      return 0; // Nenhuma mensagem para marcar
    }

    // Criar recibos de leitura para cada mensagem (apenas se não existir)
    const receiptsToCreate: any[] = [];
    
    for (const msg of unreadMessages) {
      // Verificar se já existe recibo
      const exists = await MessageReadReceipt.findOne({
        where: { messageId: msg.id, userId }
      });
      
      if (!exists) {
        receiptsToCreate.push({
          messageId: msg.id,
          userId,
          readAt: new Date()
        });
      }
    }

    if (receiptsToCreate.length > 0) {
      await MessageReadReceipt.bulkCreate(receiptsToCreate);
    }

    // ✅ CORREÇÃO: Atualizar campo isRead das mensagens de grupo
    // Isso é necessário para manter compatibilidade com contadores que usam isRead
    await InternalMessage.update(
      { isRead: true },
      { where: whereClause }
    );

    // Buscar grupo para verificar total de membros
    const group = await InternalGroup.findByPk(groupId, {
      include: ["members"]
    });

    // Para cada mensagem, verificar se todos viram e emitir evento
    for (const msg of unreadMessages) {
      const readReceipts = await MessageReadReceipt.findAll({
        where: { messageId: msg.id },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name"]
          }
        ]
      });

      const totalMembers = (group?.members?.length || 1) - 1; // Excluir remetente
      const readCount = readReceipts.length;
      const allRead = readCount >= totalMembers;

      // Emitir evento WebSocket para atualizar frontend
      socketEmit({
        tenantId,
        type: "internalChat:update",
        payload: {
          action: "groupMessageRead",
          messageId: msg.id,
          userId,
          readBy: readReceipts.map(r => ({
            userId: r.userId,
            userName: r.user.name,
            readAt: r.readAt
          })),
          allRead,
          groupId
        }
      });
    }

    return unreadMessages.length;
  }

  // Atualizar mensagens privadas
  const [updatedCount] = await InternalMessage.update(
    { isRead: true },
    { where: whereClause }
  );

  // Emitir evento para atualizar frontend
  if (updatedCount > 0) {
    socketEmit({
      tenantId,
      type: "internalChat:update",
      payload: {
        action: "markAsRead",
        userId,
        recipientId,
        groupId,
        count: updatedCount
      }
    });
  }

  return updatedCount;
};

export default MarkAsReadService;

