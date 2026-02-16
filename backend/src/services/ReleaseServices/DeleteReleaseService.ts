import AppError from "../../errors/AppError";
import SystemRelease from "../../models/SystemRelease";
import { logger } from "../../utils/logger";

interface Request {
  id: number;
}

const DeleteReleaseService = async ({ id }: Request): Promise<void> => {
  const release = await SystemRelease.findByPk(id);

  if (!release) {
    throw new AppError("Release não encontrada", 404);
  }

  try {
    await release.destroy();
  } catch (error) {
    logger.error(error);
    throw new AppError("Erro ao deletar release", 500);
  }
};

export default DeleteReleaseService;

