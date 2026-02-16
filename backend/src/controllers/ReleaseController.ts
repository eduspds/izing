import { Request, Response } from "express";
import ListReleasesService from "../services/ReleaseServices/ListReleasesService";
import GetLatestReleaseService from "../services/ReleaseServices/GetLatestReleaseService";
import GetReleaseService from "../services/ReleaseServices/GetReleaseService";
import User from "../models/User";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { searchParam, pageNumber } = req.query as IndexQuery;
    const { releases, count, hasMore } = await ListReleasesService({
      searchParam,
      pageNumber
    });
    return res.status(200).json({ releases, count, hasMore });
  } catch (error: any) {
    // Se houver erro, retornar lista vazia ao invés de erro 500
    return res.status(200).json({ 
      releases: [], 
      count: 0, 
      hasMore: false 
    });
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { release } = await GetReleaseService({ id: Number(id) });
  return res.status(200).json(release);
};

export const latest = async (
  req: Request,
  res: Response
): Promise<Response> => {
  // Headers anti-cache para garantir que o navegador sempre busque a versão mais recente
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  const { release } = await GetLatestReleaseService();

  if (!release) {
    return res.status(404).json({ message: "Nenhuma release encontrada" });
  }

  // Verificar se o usuário já viu esta versão (sempre autenticado)
  let userHasSeenVersion = false;
  const userId = req.user?.id;
  if (userId) {
    try {
      const user = await User.findByPk(userId);
      if (user && user.configs) {
        const configs =
          typeof user.configs === "string"
            ? JSON.parse(user.configs)
            : user.configs;
        const lastSeenVersion = configs?.lastSeenVersion;
        userHasSeenVersion = lastSeenVersion === release.version;
        console.log(`[ReleaseController] Verificação de versão vista - userId: ${userId}, lastSeenVersion: ${lastSeenVersion}, release.version: ${release.version}, userHasSeenVersion: ${userHasSeenVersion}`);
      } else {
        console.log(`[ReleaseController] Usuário ${userId} não tem configs ou não encontrado`);
      }
    } catch (error) {
      console.error(`[ReleaseController] Erro ao verificar versão vista:`, error);
      // Ignorar erro, continuar sem verificação
    }
  } else {
    console.log(`[ReleaseController] userId não encontrado no req.user`);
  }

  return res.status(200).json({
    version: release.version,
    title: release.title,
    description: release.description,
    forceRefresh: release.forceRefresh,
    media: release.media || [],
    createdAt: release.createdAt,
    userHasSeenVersion
  });
};

export const markVersionAsSeen = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { version } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Usuário não autenticado" });
  }

  if (!version) {
    return res.status(400).json({ message: "Versão não informada" });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Atualizar configs do usuário
    const currentConfigs = user.configs
      ? typeof user.configs === "string"
        ? JSON.parse(user.configs)
        : user.configs
      : {};

    const updatedConfigs = {
      ...currentConfigs,
      lastSeenVersion: version
    };

    console.log(`[ReleaseController] Atualizando configs do usuário ${userId}:`, {
      currentConfigs,
      updatedConfigs,
      version
    });

    await user.update({
      configs: updatedConfigs
    });

    // Recarregar usuário para verificar se foi salvo
    await user.reload();
    const savedConfigs = typeof user.configs === "string" 
      ? JSON.parse(user.configs) 
      : user.configs;
    
    console.log(`[ReleaseController] Versão ${version} marcada como vista para userId: ${userId}`, {
      savedLastSeenVersion: savedConfigs?.lastSeenVersion
    });

    return res.status(200).json({ 
      message: "Versão marcada como vista",
      lastSeenVersion: version
    });
  } catch (error) {
    console.error(`[ReleaseController] Erro ao salvar versão vista:`, error);
    return res.status(500).json({ message: "Erro ao salvar versão vista" });
  }
};
