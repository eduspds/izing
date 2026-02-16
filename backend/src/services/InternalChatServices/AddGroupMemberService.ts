import InternalGroup from "../../models/InternalGroup";
import InternalGroupMember from "../../models/InternalGroupMember";
import User from "../../models/User";
import Setting from "../../models/Setting";
import AppError from "../../errors/AppError";
import socketEmit from "../../helpers/socketEmit";
import { GetConfigService } from "./InternalChatConfigService";

interface Request {
  groupId: number;
  userId: number; // Quem está adicionando
  newMemberIds: number[];
  tenantId: number;
}

/**
 * Service para adicionar membros a um grupo
 * 
 * Verificações configuráveis:
 * - internalChat.allowMembersAddOthers: Permite membros adicionarem outros (padrão: true)
 * - internalChat.allowOnlySameQueue: Permite adicionar apenas usuários do mesmo departamento (padrão: false)
 * - internalChat.allowOnlyManagersManage: Apenas gerentes podem gerenciar grupos (padrão: false)
 */
const AddGroupMemberService = async ({
  groupId,
  userId,
  newMemberIds,
  tenantId
}: Request): Promise<InternalGroupMember[]> => {
  // Buscar grupo
  const group = await InternalGroup.findOne({
    where: { id: groupId, tenantId },
    include: ["creator", "members"]
  });

  if (!group) {
    throw new AppError("ERR_GROUP_NOT_FOUND", 404);
  }

  // Buscar usuário que está adicionando
  const user = await User.findOne({
    where: { id: userId, tenantId },
    include: ["queues"]
  });

  if (!user) {
    throw new AppError("ERR_USER_NOT_FOUND", 404);
  }

  // Verificar se usuário é membro do grupo
  const isMember = group.members?.some(m => m.userId === userId);
  const isCreator = group.createdBy === userId;

  if (!isMember && !isCreator) {
    throw new AppError("ERR_USER_NOT_GROUP_MEMBER", 403);
  }

  // ✅ Verificar configurações do tenant
  const settings = await Setting.findAll({
    where: {
      tenantId,
      key: [
        "internalChat.allowMembersAddOthers",
        "internalChat.allowOnlySameQueue",
        "internalChat.allowOnlyManagersManage"
      ]
    }
  });

  const settingsMap = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value === "true";
    return acc;
  }, {} as Record<string, boolean>);

  // ✅ Buscar configurações do chat interno
  const config = await GetConfigService({ tenantId: Number(tenantId) });

  // ✅ Configuração 1: Verificar se usuários podem adicionar membros
  if (!config.allowUsersAddMembers && !isCreator) {
    throw new AppError("ERR_ONLY_CREATOR_CAN_ADD_MEMBERS", 403);
  }

  // ✅ Configuração 2: Verificar se apenas gerentes podem adicionar membros
  if (config.onlyManagersAddMembers && user.profile !== "admin" && !isCreator) {
    throw new AppError("ERR_ONLY_MANAGERS_CAN_ADD_MEMBERS", 403);
  }

  // Buscar novos membros
  const newMembers = await User.findAll({
    where: { id: newMemberIds, tenantId },
    include: ["queues"],
    attributes: ["id", "name", "email", "profile"]
  });

  if (newMembers.length === 0) {
    throw new AppError("ERR_NO_VALID_MEMBERS", 400);
  }

  // ✅ Verificar restrições de departamento para grupos
  if (config.restrictGroupsByQueue && group.department) {
    for (const member of newMembers) {
      const memberQueueIds = member.queues?.map(q => q.id) || [];
      const memberQueueNames = member.queues?.map(q => q.queue) || [];
      
      // Verificar se o membro pertence ao departamento do grupo
      const belongsToDepartment = memberQueueNames.includes(group.department) || memberQueueIds.includes(parseInt(group.department));
      
      if (!belongsToDepartment) {
        throw new AppError(
          `ERR_MEMBER_NOT_IN_GROUP_DEPARTMENT: ${member.name} não pertence ao departamento ${group.department}`,
          400
        );
      }
    }
  }

  // ✅ Verificar restrições de perfil para grupos
  if (config.restrictGroupsByProfile && group.allowedProfile) {
    for (const member of newMembers) {
      if (member.profile !== group.allowedProfile) {
        throw new AppError(
          `ERR_MEMBER_NOT_SAME_PROFILE: ${member.name} não tem o perfil permitido ${group.allowedProfile}`,
          400
        );
      }
    }
  }

  // Filtrar membros que já estão no grupo
  const existingMemberIds = group.members?.map(m => m.userId) || [];
  const membersToAdd = newMembers.filter(m => !existingMemberIds.includes(m.id));

  if (membersToAdd.length === 0) {
    throw new AppError("ERR_MEMBERS_ALREADY_IN_GROUP", 400);
  }

  // Adicionar membros
  const groupMembers = await Promise.all(
    membersToAdd.map(member =>
      InternalGroupMember.create({
        userId: member.id,
        groupId: group.id
      })
    )
  );

  // ✅ Emitir evento WebSocket para todos os membros do grupo
  const allMemberIds = [...existingMemberIds, ...membersToAdd.map(m => m.id)];
  
  socketEmit({
    tenantId,
    type: "internalChat:groupMembersAdded",
    payload: {
      groupId: group.id,
      groupName: group.name,
      addedBy: {
        id: user.id,
        name: user.name
      },
      newMembers: membersToAdd.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email
      }))
    }
  });

  return groupMembers;
};

export default AddGroupMemberService;

