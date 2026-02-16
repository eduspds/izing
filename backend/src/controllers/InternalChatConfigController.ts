import { Request, Response } from "express";
import { GetConfigService, UpdateConfigService } from "../services/InternalChatServices/InternalChatConfigService";
import AppError from "../errors/AppError";

export const getConfig = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tenantId } = req.user;

  try {
    const config = await GetConfigService({ tenantId: Number(tenantId) });
    return res.json(config);
  } catch (error) {
    console.error("Erro ao buscar configuração do chat interno:", error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updateConfig = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tenantId } = req.user;
  const {
    communicationRestriction,
    allowUsersCreateGroups,
    allowUsersAddMembers,
    onlyManagersCreateGroups,
    onlyManagersAddMembers,
    restrictGroupsByQueue,
    restrictGroupsByProfile
  } = req.body;

  try {
    const config = await UpdateConfigService({
      tenantId: Number(tenantId),
      communicationRestriction,
      allowUsersCreateGroups,
      allowUsersAddMembers,
      onlyManagersCreateGroups,
      onlyManagersAddMembers,
      restrictGroupsByQueue,
      restrictGroupsByProfile
    });

    return res.json(config);
  } catch (error) {
    console.error("Erro ao atualizar configuração do chat interno:", error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};
