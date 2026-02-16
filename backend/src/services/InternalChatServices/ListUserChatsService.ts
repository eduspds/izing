import { Op, QueryTypes } from "sequelize";
import User from "../../models/User";
import InternalMessage from "../../models/InternalMessage";

interface ListUserChatsRequest {
  userId: number;
  tenantId: number | string;
}

interface ChatPreview {
  user: {
    id: number;
    name: string;
    email: string;
  };
  lastMessage: {
    message: string;
    createdAt: Date;
    senderId: number;
    isRead: boolean;
  } | null;
  unreadCount: number;
}

const ListUserChatsService = async ({
  userId,
  tenantId
}: ListUserChatsRequest): Promise<ChatPreview[]> => {
  // Query otimizada para buscar conversas com última mensagem e contador de não lidas
  const query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u."isOnline",
      u."lastOnline",
      lm.message as "lastMessage",
      lm."createdAt" as "lastMessageDate",
      lm."senderId" as "lastMessageSenderId",
      lm."isRead" as "lastMessageIsRead",
      COALESCE(unread.count, 0) as "unreadCount"
    FROM "Users" u
    LEFT JOIN LATERAL (
      SELECT message, "createdAt", "senderId", "isRead"
      FROM "InternalMessages"
      WHERE "tenantId" = :tenantId
        AND "isDeleted" = false
        AND (
          ("senderId" = :userId AND "recipientId" = u.id)
          OR ("senderId" = u.id AND "recipientId" = :userId)
        )
      ORDER BY "createdAt" DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int as count
      FROM "InternalMessages"
      WHERE "tenantId" = :tenantId
        AND "senderId" = u.id
        AND "recipientId" = :userId
        AND "isRead" = false
        AND "isDeleted" = false
    ) unread ON true
    WHERE u.id != :userId
      AND u."tenantId" = :tenantId
      AND lm.message IS NOT NULL
    ORDER BY lm."createdAt" DESC NULLS LAST;
  `;

  const results: any[] = await User.sequelize?.query(query, {
    replacements: { userId, tenantId },
    type: QueryTypes.SELECT
  }) || [];

  return results.map(r => ({
    user: {
      id: r.id,
      name: r.name,
      email: r.email,
      isOnline: r.isOnline || false,
      lastOnline: r.lastOnline
    },
    lastMessage: r.lastMessage ? {
      message: r.lastMessage,
      createdAt: r.lastMessageDate,
      senderId: r.lastMessageSenderId,
      isRead: r.lastMessageIsRead || false
    } : null,
    unreadCount: r.unreadCount
  }));
};

export default ListUserChatsService;

