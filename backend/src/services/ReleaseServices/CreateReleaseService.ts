import AppError from "../../errors/AppError";
import SystemRelease from "../../models/SystemRelease";
import { logger } from "../../utils/logger";

interface Request {
  version: string;
  title: string;
  description: string;
  forceRefresh?: boolean;
}

interface Response {
  release: SystemRelease;
}

const CreateReleaseService = async ({
  version,
  title,
  description,
  forceRefresh = false
}: Request): Promise<Response> => {
  // Validar formato SemVer básico (ex: 1.0.5, 2.1.0)
  const semVerPattern = /^\d+\.\d+\.\d+$/;
  if (!semVerPattern.test(version)) {
    throw new AppError(
      "Versão deve seguir o formato SemVer (ex: 1.0.5, 2.1.0)",
      400
    );
  }

  // Verificar se a versão já existe
  const existingRelease = await SystemRelease.findOne({
    where: { version }
  });

  if (existingRelease) {
    throw new AppError("Esta versão já existe no sistema", 400);
  }

  // Validar campos obrigatórios
  if (!title || !description) {
    throw new AppError("Título e descrição são obrigatórios", 400);
  }

  try {
    const release = await SystemRelease.create({
      version,
      title,
      description,
      forceRefresh
    });

    return { release };
  } catch (error) {
    logger.error(error);
    throw new AppError("Erro ao criar release", 500);
  }
};

export default CreateReleaseService;

