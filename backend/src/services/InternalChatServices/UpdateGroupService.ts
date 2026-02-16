import InternalGroup from "../../models/InternalGroup";
import User from "../../models/User";
import AppError from "../../errors/AppError";
import socketEmit from "../../helpers/socketEmit";
import { GetConfigService } from "./InternalChatConfigService";

interface Request {
  groupId: number;
  userId: number;
  name?: string;
  description?: string;
  department?: string;
  allowedProfile?: string;
  tenantId: number;
}

/**
 * Service para atualizar informações do grupo
 *
 * Apenas o criador do grupo ou admins podem editar
 */
const UpdateGroupService = async ({
  groupId,
  userId,
  name,
  description,
  department,
  allowedProfile,
  tenantId
}: Request): Promise<InternalGroup> => {
  console.log("📝 SERVICE: Iniciando atualização do grupo:", {
    groupId,
    userId,
    name,
    description,
    department,
    allowedProfile,
    tenantId
  });

  // Buscar grupo
  const group = await InternalGroup.findOne({
    where: { id: groupId, tenantId },
    include: ["members", "creator"]
  });

  if (!group) {
    throw new AppError("ERR_GROUP_NOT_FOUND", 404);
  }

  console.log("📝 SERVICE: Grupo encontrado:", {
    id: group.id,
    name: group.name,
    department: group.department,
    allowedProfile: group.allowedProfile
  });

  // Buscar usuário que está editando
  const user = await User.findOne({
    where: { id: userId, tenantId }
  });

  if (!user) {
    throw new AppError("ERR_USER_NOT_FOUND", 404);
  }

  // Verificar se usuário é criador ou admin
  const isCreator = group.createdBy === userId;
  const isAdmin = user.profile === "admin";

  if (!isCreator && !isAdmin) {
    throw new AppError("ERR_ONLY_CREATOR_OR_ADMIN_CAN_EDIT", 403);
  }

  // Buscar configurações
  const config = await GetConfigService({ tenantId: Number(tenantId) });

  // Verificar se está removendo o departamento (tornando grupo sem departamento)
  if (
    group.department &&
    !department &&
    (config.restrictGroupsByQueue || config.restrictGroupsByProfile)
  ) {
    if (user.profile !== "admin") {
      throw new AppError("ERR_GROUPS_WITHOUT_DEPARTMENT_ONLY_FOR_ADMINS", 403);
    }
  }

  // Atualizar informações do grupo
  if (name !== undefined) {
    console.log("📝 SERVICE: Atualizando nome:", name);
    group.name = name;
  }

  if (description !== undefined) {
    console.log("📝 SERVICE: Atualizando descrição:", description);
    group.description = description;
  }

  if (department !== undefined) {
    console.log("📝 SERVICE: Atualizando departamento:", department);
    group.department = department || "";
  }

  if (allowedProfile !== undefined) {
    console.log("📝 SERVICE: Atualizando perfil permitido:", allowedProfile);
    group.allowedProfile = allowedProfile || "";
  }

  console.log("📝 SERVICE: Salvando grupo no banco...");
  await group.save();
  
  console.log("📝 SERVICE: Grupo salvo com sucesso:", {
    id: group.id,
    name: group.name,
    department: group.department,
    allowedProfile: group.allowedProfile
  });

  // Emitir evento via socket para todos os membros
  const memberIds = group.members?.map(m => m.userId) || [];

  memberIds.forEach(memberId => {
    socketEmit({
      tenantId: Number(tenantId),
      type: "internalChat:groupUpdated",
      payload: {
        groupId: group.id,
        name: group.name,
        description: group.description,
        department: group.department,
        allowedProfile: group.allowedProfile,
        userId: memberId
      }
    });
  });

  return group;
};

export default UpdateGroupService;
