import AppError from "../../errors/AppError";
import SystemRelease from "../../models/SystemRelease";
import { logger } from "../../utils/logger";
import { Op } from "sequelize";

interface Request {
  id: number;
  version?: string;
  title?: string;
  description?: string;
  forceRefresh?: boolean;
}

interface Response {
  release: SystemRelease;
}

const UpdateReleaseService = async ({
  id,
  version,
  title,
  description,
  forceRefresh
}: Request): Promise<Response> => {
  const release = await SystemRelease.findByPk(id);

  if (!release) {
    throw new AppError("Release não encontrada", 404);
  }

  // Se estiver atualizando a versão, validar formato e unicidade
  if (version) {
    const semVerPattern = /^\d+\.\d+\.\d+$/;
    if (!semVerPattern.test(version)) {
      throw new AppError(
        "Versão deve seguir o formato SemVer (ex: 1.0.5, 2.1.0)",
        400
      );
    }

    // Verificar se a versão já existe em outra release
    const existingRelease = await SystemRelease.findOne({
      where: { version, id: { [Op.ne]: id } }
    });

    if (existingRelease) {
      throw new AppError("Esta versão já existe no sistema", 400);
    }
  }

  try {
    await release.update({
      ...(version && { version }),
      ...(title && { title }),
      ...(description && { description }),
      ...(forceRefresh !== undefined && { forceRefresh })
    });

    return { release };
  } catch (error) {
    logger.error(error);
    throw new AppError("Erro ao atualizar release", 500);
  }
};

export default UpdateReleaseService;

