import { Op } from "sequelize";
import InternalMessage from "../../models/InternalMessage";
import User from "../../models/User";
import InternalGroup from "../../models/InternalGroup";
import MessageReadReceipt from "../../models/MessageReadReceipt";

interface ListMessagesRequest {
  userId: number;
  recipientId?: number;
  groupId?: number;
  tenantId: number | string;
  limit?: number;
  offset?: number;
}

interface ListMessagesResponse {
  messages: InternalMessage[];
  count: number;
  hasMore: boolean;
}

const ListMessagesService = async ({
  userId,
  recipientId,
  groupId,
  tenantId,
  limit = 50,
  offset = 0
}: ListMessagesRequest): Promise<ListMessagesResponse> => {
  let whereClause: any = {
    tenantId,
    isDeleted: false
  };

  // Chat privado - mensagens entre userId e recipientId (em ambas direções)
  if (recipientId) {
    whereClause = {
      ...whereClause,
      [Op.or]: [
        { senderId: userId, recipientId },
        { senderId: recipientId, recipientId: userId }
      ]
    };
  }

  // Chat de grupo
  if (groupId) {
    whereClause.groupId = groupId;
  }

  // Buscar mensagens com paginação
  const { count, rows: messages } = await InternalMessage.findAndCountAll({
    where: whereClause,
    include: [
      {
        association: "sender",
        attributes: ["id", "name", "email"]
      },
      {
        association: "recipient",
        attributes: ["id", "name", "email"],
        required: false
      },
      {
        association: "group",
        attributes: ["id", "name"],
        required: false
      },
      {
        association: "quotedMessage",
        include: [
          {
            association: "sender",
            attributes: ["id", "name"]
          }
        ],
        required: false
      },
      {
        model: MessageReadReceipt,
        as: "readReceipts",
        required: false,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name"]
          }
        ]
      }
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset
  });

  // Transformar readReceipts em readBy para o frontend
  const messagesWithReadBy = messages.map(msg => {
    const plain = msg.get({ plain: true }) as any;
    
    if (plain.readReceipts && plain.readReceipts.length > 0) {
      plain.readBy = plain.readReceipts.map((receipt: any) => ({
        userId: receipt.userId,
        userName: receipt.user.name,
        readAt: receipt.readAt
      }));
    } else {
      plain.readBy = [];
    }
    
    delete plain.readReceipts; // Remover para não confundir frontend
    return plain;
  });

  const hasMore = count > offset + messagesWithReadBy.length;

  return {
    messages: messagesWithReadBy.reverse(), // Inverter para ordem cronológica
    count,
    hasMore
  };
};

export default ListMessagesService;

