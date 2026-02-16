import InternalGroup from "../../models/InternalGroup";
import InternalGroupMember from "../../models/InternalGroupMember";
import User from "../../models/User";
import AppError from "../../errors/AppError";
import socketEmit from "../../helpers/socketEmit";
import { GetConfigService } from "./InternalChatConfigService";

interface Request {
  name: string;
  description?: string;
  creatorId: number;
  memberIds: number[];
  tenantId: number;
  department?: string;
  allowedProfile?: string;
}

interface Response {
  group: InternalGroup;
  members: User[];
}

/**
 * Service para criar grupo no chat interno
 * 
 * Verificações configuráveis:
 * - internalChat.allowUserCreateGroup: Permite usuários criarem grupos (padrão: true)
 * - internalChat.allowOnlySameQueue: Permite adicionar apenas usuários do mesmo departamento (padrão: false)
 * - internalChat.allowOnlyManagers: Apenas gerentes podem criar grupos (padrão: false)
 */
const CreateGroupService = async ({
  name,
  description,
  creatorId,
  memberIds,
  tenantId,
  department,
  allowedProfile
}: Request): Promise<Response> => {
  // Buscar usuário criador
  const creator = await User.findOne({
    where: { id: creatorId, tenantId },
    include: ["queues"]
  });

  if (!creator) {
    throw new AppError("ERR_USER_NOT_FOUND", 404);
  }

  // ✅ Buscar configurações do chat interno
  const config = await GetConfigService({ tenantId });

  // ✅ Configuração 1: Verificar se usuários podem criar grupos
  if (!config.allowUsersCreateGroups) {
    throw new AppError("ERR_GROUP_CREATION_DISABLED", 403);
  }

  // ✅ Configuração 2: Verificar se apenas gerentes podem criar grupos
  if (config.onlyManagersCreateGroups && creator.profile !== "admin") {
    throw new AppError("ERR_ONLY_MANAGERS_CAN_CREATE_GROUPS", 403);
  }

  // ✅ Configuração 3: Verificar se grupos sem departamento são permitidos apenas para admins
  if (!department && (config.restrictGroupsByQueue || config.restrictGroupsByProfile)) {
    if (creator.profile !== "admin") {
      throw new AppError("ERR_GROUPS_WITHOUT_DEPARTMENT_ONLY_FOR_ADMINS", 403);
    }
  }

  // ✅ Configuração 4: Verificar restrições de departamento para grupos
  
  // Adicionar criador aos membros se não estiver
  if (!memberIds.includes(creatorId)) {
    memberIds.push(creatorId);
  }

  // Buscar membros
  const members = await User.findAll({
    where: { id: memberIds, tenantId },
    include: ["queues"],
    attributes: ["id", "name", "email", "profile"]
  });

  if (members.length === 0) {
    throw new AppError("ERR_NO_VALID_MEMBERS", 400);
  }

  // ✅ Verificar restrições de departamento para grupos
  if (config.restrictGroupsByQueue && department) {
    for (const member of members) {
      const memberQueueIds = member.queues?.map(q => q.id) || [];
      const memberQueueNames = member.queues?.map(q => q.queue) || [];
      
      // Verificar se o membro pertence ao departamento do grupo
      const belongsToDepartment = memberQueueNames.includes(department) || memberQueueIds.includes(parseInt(department));
      
      if (!belongsToDepartment && member.id !== creatorId) {
        throw new AppError(
          `ERR_MEMBER_NOT_IN_GROUP_DEPARTMENT: ${member.name} não pertence ao departamento ${department}`,
          400
        );
      }
    }
  }

  // ✅ Verificar restrições de perfil para grupos
  if (config.restrictGroupsByProfile && allowedProfile) {
    for (const member of members) {
      if (member.profile !== allowedProfile && member.id !== creatorId) {
        throw new AppError(
          `ERR_MEMBER_NOT_SAME_PROFILE: ${member.name} não tem o perfil permitido ${allowedProfile}`,
          400
        );
      }
    }
  }

  // Criar grupo
  const group = await InternalGroup.create({
    name,
    description: description || null,
    createdBy: creatorId,
    tenantId,
    department: department || null,
    allowedProfile: allowedProfile || null
  });

  // Adicionar membros ao grupo
  await Promise.all(
    members.map(member =>
      InternalGroupMember.create({
        userId: member.id,
        groupId: group.id
      })
    )
  );

  // Recarregar grupo com membros
  await group.reload({
    include: [
      {
        association: "members",
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "isOnline", "lastOnline"]
          }
        ]
      },
      {
        model: User,
        as: "creator",
        attributes: ["id", "name", "email"]
      }
    ]
  });

  // ✅ Emitir evento WebSocket para todos os membros
  members.forEach(() => {
    socketEmit({
      tenantId,
      type: "internalChat:groupCreated",
      payload: {
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          department: group.department,
          allowedProfile: group.allowedProfile,
          creator: {
            id: creator.id,
            name: creator.name,
            email: creator.email
          },
          members: members.map(m => ({
            id: m.id,
            name: m.name,
            email: m.email
          })),
          createdAt: group.createdAt
        }
      }
    });
  });

  return { group, members };
};

export default CreateGroupService;

