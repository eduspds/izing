import InternalGroup from "../../models/InternalGroup";
import InternalGroupMember from "../../models/InternalGroupMember";
import User from "../../models/User";
import Setting from "../../models/Setting";
import AppError from "../../errors/AppError";
import socketEmit from "../../helpers/socketEmit";

interface Request {
  groupId: number;
  userId: number; // Quem está removendo
  memberIdToRemove: number;
  tenantId: number;
}

/**
 * Service para remover membro de um grupo (ou sair do grupo)
 * 
 * Verificações configuráveis:
 * - internalChat.allowOnlyManagersManage: Apenas gerentes podem remover membros (padrão: false)
 * - Criador do grupo sempre pode remover
 * - Usuário sempre pode sair do próprio grupo
 */
const RemoveGroupMemberService = async ({
  groupId,
  userId,
  memberIdToRemove,
  tenantId
}: Request): Promise<void> => {
  // Buscar grupo
  const group = await InternalGroup.findOne({
    where: { id: groupId, tenantId },
    include: ["creator", "members"]
  });

  if (!group) {
    throw new AppError("ERR_GROUP_NOT_FOUND", 404);
  }

  // Buscar usuário que está removendo
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError("ERR_USER_NOT_FOUND", 404);
  }

  // Buscar membro a ser removido
  const memberToRemove = await User.findByPk(memberIdToRemove);
  if (!memberToRemove) {
    throw new AppError("ERR_MEMBER_NOT_FOUND", 404);
  }

  const isCreator = group.createdBy === userId;
  const isSelfRemoval = userId === memberIdToRemove;

  // ✅ Usuário sempre pode sair do próprio grupo
  if (!isSelfRemoval) {
    // ✅ Verificar configurações para remoção de outros
    const settings = await Setting.findAll({
      where: {
        tenantId,
        key: ["internalChat.allowOnlyManagersManage"]
      }
    });

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value === "true";
      return acc;
    }, {} as Record<string, boolean>);

    const allowOnlyManagersManage = settingsMap["internalChat.allowOnlyManagersManage"] === true;

    // ✅ Verificar permissões
    if (!isCreator && allowOnlyManagersManage && user.profile !== "manager" && user.profile !== "admin") {
      throw new AppError("ERR_ONLY_MANAGERS_CAN_MANAGE_GROUPS", 403);
    }

    if (!isCreator && !allowOnlyManagersManage) {
      throw new AppError("ERR_ONLY_CREATOR_CAN_REMOVE_MEMBERS", 403);
    }
  }

  // ❌ Não permitir remover o criador
  if (memberIdToRemove === group.createdBy && !isSelfRemoval) {
    throw new AppError("ERR_CANNOT_REMOVE_CREATOR", 400);
  }

  // Remover membro
  const deleted = await InternalGroupMember.destroy({
    where: {
      userId: memberIdToRemove,
      groupId
    }
  });

  if (deleted === 0) {
    throw new AppError("ERR_MEMBER_NOT_IN_GROUP", 404);
  }

  // ✅ Se for o criador saindo e não há mais membros, deletar grupo
  if (isSelfRemoval && isCreator) {
    const remainingMembers = await InternalGroupMember.count({
      where: { groupId }
    });

    if (remainingMembers === 0) {
      await group.destroy();
      
      // Emitir evento de grupo deletado
      socketEmit({
        tenantId,
        type: "internalChat:groupDeleted",
        payload: {
          groupId: group.id,
          groupName: group.name
        }
      });
      
      return;
    }
  }

  // ✅ Emitir evento WebSocket
  const action = isSelfRemoval ? "left" : "removed";
  
  socketEmit({
    tenantId,
    type: "internalChat:groupMemberRemoved",
    payload: {
      groupId: group.id,
      groupName: group.name,
      action,
      removedBy: {
        id: user.id,
        name: user.name
      },
      removedMember: {
        id: memberToRemove.id,
        name: memberToRemove.name
      }
    }
  });
};

export default RemoveGroupMemberService;

