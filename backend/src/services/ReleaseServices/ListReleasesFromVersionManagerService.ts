import axios from "axios";
import { logger } from "../../utils/logger";

interface ReleaseItem {
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

interface ListReleasesResponse {
  releases: ReleaseItem[];
  count: number;
  hasMore: boolean;
}

interface Request {
  searchParam?: string;
  pageNumber?: string | number;
}

const ListReleasesFromVersionManagerService = async ({
  searchParam = "",
  pageNumber = "1"
}: Request): Promise<ListReleasesResponse> => {
  const apiVersionUrl = process.env.API_VERSION;

  if (!apiVersionUrl) {
    logger.warn("API_VERSION não configurada no .env");
    return {
      releases: [],
      count: 0,
      hasMore: false
    };
  }

  try {
    // Garantir que a URL termine com /api
    const baseUrl = apiVersionUrl.endsWith("/") 
      ? apiVersionUrl.slice(0, -1) 
      : apiVersionUrl;
    const url = `${baseUrl}/api/public/releases`;

    const params: any = {
      pageNumber: pageNumber.toString()
    };

    if (searchParam) {
      params.searchParam = searchParam;
    }

    const response = await axios.get<ListReleasesResponse>(url, {
      params,
      timeout: 10000, // Aumentado para 10 segundos
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Erro desconhecido";
    const statusCode = error?.response?.status;
    
    logger.error(`Erro ao listar releases do version-manager: ${errorMessage} (Status: ${statusCode})`);
    
    // Sempre retornar resposta vazia em caso de erro para não quebrar a interface
    logger.warn("Version-manager não disponível ou erro na requisição. Retornando lista vazia.");
    return {
      releases: [],
      count: 0,
      hasMore: false
    };
  }
};

export default ListReleasesFromVersionManagerService;

