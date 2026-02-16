import axios from "axios";
import { logger } from "../../utils/logger";
import AppError from "../../errors/AppError";

interface ReleaseResponse {
  version: string;
  title: string;
  description: string;
  forceRefresh: boolean;
  media?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }>;
  createdAt: string;
}

const GetLatestReleaseFromVersionManagerService = async (): Promise<ReleaseResponse | null> => {
  const apiVersionUrl = process.env.API_VERSION;

  if (!apiVersionUrl) {
    logger.warn("API_VERSION não configurada no .env");
    return null;
  }

  try {
    // Garantir que a URL termine com /api
    const baseUrl = apiVersionUrl.endsWith("/") 
      ? apiVersionUrl.slice(0, -1) 
      : apiVersionUrl;
    const url = `${baseUrl}/api/public/latest-release`;

    const response = await axios.get<ReleaseResponse>(url, {
      timeout: 5000, // 5 segundos de timeout
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    return response.data;
  } catch (error) {
    logger.error(`Erro ao buscar release do version-manager: ${error}`);
    // Não lançar erro, apenas retornar null para não quebrar o sistema
    return null;
  }
};

export default GetLatestReleaseFromVersionManagerService;

