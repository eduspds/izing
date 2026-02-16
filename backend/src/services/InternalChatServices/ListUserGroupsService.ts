import { Op, QueryTypes } from "sequelize";
import InternalGroup from "../../models/InternalGroup";
import InternalGroupMember from "../../models/InternalGroupMember";
import InternalMessage from "../../models/InternalMessage";
import User from "../../models/User";

interface Request {
  userId: number;
  tenantId: number;
}

interface GroupPreview {
  id: number;
  name: string;
  description: string | null;
  department?: string | null;
  allowedProfile?: string | null;
  creator: {
    id: number;
    name: string;
  };
  members: {
    id: number;
    name: string;
    email: string;
    isOnline: boolean;
    lastOnline?: Date;
  }[];
  lastMessage: {
    message: string;
    createdAt: Date;
    senderId: number;
    senderName: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
  createdAt: Date;
}

/**
 * Service para listar grupos do usuário com preview da última mensagem
 */
const ListUserGroupsService = async ({
  userId,
  tenantId
}: Request): Promise<GroupPreview[]> => {
  // Buscar grupos onde o usuário é membro
  const memberships = await InternalGroupMember.findAll({
    where: {
      userId,
      leftAt: null // Apenas grupos que o usuário ainda está
    },
    include: [
      {
        model: InternalGroup,
        as: "group",
        where: {
          tenantId // ✅ Filtrar por tenantId no grupo
        },
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "name"]
          },
          {
            association: "members",
            where: {
              leftAt: null
            },
            required: false,
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "name", "email", "isOnline", "lastOnline"]
              }
            ]
          }
        ]
      }
    ]
  });

  const groups: GroupPreview[] = [];

  for (const membership of memberships) {
    const group = membership.group;
    
    if (!group) continue;

    // Buscar última mensagem do grupo
    const lastMessage = await InternalMessage.findOne({
      where: {
        groupId: group.id,
        tenantId,
        isDeleted: false
      },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "name"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    // ✅ Contar mensagens não lidas verificando a tabela MessageReadReceipt
    // Para grupos, uma mensagem pode ser lida por alguns membros e não por outros
    const unreadCountQuery = `
      SELECT COUNT(*)::int as count
      FROM "InternalMessages" im
      WHERE im."groupId" = :groupId
        AND im."tenantId" = :tenantId
        AND im."isDeleted" = false
        AND im."senderId" != :userId
        AND NOT EXISTS (
          SELECT 1 
          FROM "MessageReadReceipts" mrr 
          WHERE mrr."messageId" = im.id 
            AND mrr."userId" = :userId
        )
    `;

    const unreadResult: any = await InternalMessage.sequelize?.query(
      unreadCountQuery,
      {
        replacements: { 
          groupId: group.id, 
          tenantId, 
          userId 
        },
        type: QueryTypes.SELECT
      }
    );

    const unreadCount = unreadResult?.[0]?.count || 0;

    groups.push({
      id: group.id,
      name: group.name,
      description: group.description,
      department: group.department,
      allowedProfile: group.allowedProfile,
      creator: {
        id: group.creator.id,
        name: group.creator.name
      },
      members: group.members?.map(m => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        isOnline: m.user.isOnline || false,
        lastOnline: m.user.lastOnline
      })) || [],
      lastMessage: lastMessage
        ? {
            message: lastMessage.message,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
            senderName: lastMessage.sender.name,
            isRead: lastMessage.isRead
          }
        : null,
      unreadCount,
      createdAt: group.createdAt
    });
  }

  // Ordenar por última mensagem (mais recente primeiro)
  groups.sort((a, b) => {
    const dateA = a.lastMessage?.createdAt || a.createdAt;
    const dateB = b.lastMessage?.createdAt || b.createdAt;
    return dateB.getTime() - dateA.getTime();
  });

  return groups;
};

export default ListUserGroupsService;

