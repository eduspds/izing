import InternalChatConfig from "../../models/InternalChatConfig";
import AppError from "../../errors/AppError";

interface GetConfigRequest {
  tenantId: number;
}

interface UpdateConfigRequest {
  tenantId: number;
  communicationRestriction?: "none" | "sameQueue" | "sameProfile";
  allowUsersCreateGroups?: boolean;
  allowUsersAddMembers?: boolean;
  onlyManagersCreateGroups?: boolean;
  onlyManagersAddMembers?: boolean;
  restrictGroupsByQueue?: boolean;
  restrictGroupsByProfile?: boolean;
}

const GetConfigService = async ({ tenantId }: GetConfigRequest): Promise<InternalChatConfig> => {
  try {
    let config = await InternalChatConfig.findOne({
      where: { tenantId }
    });

    // Se não existe configuração, criar uma padrão
    if (!config) {
      config = await InternalChatConfig.create({
        tenantId: Number(tenantId),
        communicationRestriction: "none",
        allowUsersCreateGroups: true,
        allowUsersAddMembers: true,
        onlyManagersCreateGroups: false,
        onlyManagersAddMembers: false,
        restrictGroupsByQueue: false,
        restrictGroupsByProfile: false
      });
    }

    return config;
  } catch (error) {
    console.error("Erro ao buscar configuração do chat interno:", error);
    throw new AppError("ERR_INTERNAL_CHAT_CONFIG_GET", 500);
  }
};

const UpdateConfigService = async (data: UpdateConfigRequest): Promise<InternalChatConfig> => {
  const {
    tenantId,
    communicationRestriction,
    allowUsersCreateGroups,
    allowUsersAddMembers,
    onlyManagersCreateGroups,
    onlyManagersAddMembers,
    restrictGroupsByQueue,
    restrictGroupsByProfile
  } = data;

  try {
    // Buscar ou criar configuração
    let config = await InternalChatConfig.findOne({
      where: { tenantId }
    });

    if (!config) {
      config = await InternalChatConfig.create({
        tenantId: Number(tenantId),
        communicationRestriction: communicationRestriction || "none",
        allowUsersCreateGroups: allowUsersCreateGroups !== undefined ? allowUsersCreateGroups : true,
        allowUsersAddMembers: allowUsersAddMembers !== undefined ? allowUsersAddMembers : true,
        onlyManagersCreateGroups: onlyManagersCreateGroups || false,
        onlyManagersAddMembers: onlyManagersAddMembers || false,
        restrictGroupsByQueue: restrictGroupsByQueue || false,
        restrictGroupsByProfile: restrictGroupsByProfile || false
      });
    } else {
      // Atualizar configuração existente
      const updateData: any = {};
      
      if (communicationRestriction !== undefined) updateData.communicationRestriction = communicationRestriction;
      if (allowUsersCreateGroups !== undefined) updateData.allowUsersCreateGroups = allowUsersCreateGroups;
      if (allowUsersAddMembers !== undefined) updateData.allowUsersAddMembers = allowUsersAddMembers;
      if (onlyManagersCreateGroups !== undefined) updateData.onlyManagersCreateGroups = onlyManagersCreateGroups;
      if (onlyManagersAddMembers !== undefined) updateData.onlyManagersAddMembers = onlyManagersAddMembers;
      if (restrictGroupsByQueue !== undefined) updateData.restrictGroupsByQueue = restrictGroupsByQueue;
      if (restrictGroupsByProfile !== undefined) updateData.restrictGroupsByProfile = restrictGroupsByProfile;

      await config.update(updateData);
      await config.reload();
    }

    return config;
  } catch (error) {
    console.error("Erro ao atualizar configuração do chat interno:", error);
    throw new AppError("ERR_INTERNAL_CHAT_CONFIG_UPDATE", 500);
  }
};

export { GetConfigService, UpdateConfigService };
