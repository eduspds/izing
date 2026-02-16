import axios from "axios";
import { logger } from "../../utils/logger";
import AppError from "../../errors/AppError";

interface ReleaseResponse {
  id: number;
  version: string;
  title: string;
  description: string;
  forceRefresh: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

const GetReleaseFromVersionManagerService = async (id: number): Promise<ReleaseResponse> => {
  const apiVersionUrl = process.env.API_VERSION;

  if (!apiVersionUrl) {
    throw new AppError("API_VERSION não configurada", 500);
  }

  try {
    // Garantir que a URL termine com /api
    const baseUrl = apiVersionUrl.endsWith("/") 
      ? apiVersionUrl.slice(0, -1) 
      : apiVersionUrl;
    const url = `${baseUrl}/api/public/releases/${id}`;

    const response = await axios.get<ReleaseResponse>(url, {
      timeout: 5000,
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    return response.data;
  } catch (error) {
    logger.error(`Erro ao buscar release ${id} do version-manager: ${error}`);
    throw new AppError("Release não encontrada", 404);
  }
};

export default GetReleaseFromVersionManagerService;

