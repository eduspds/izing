import ListReleasesFromVersionManagerService from "./ListReleasesFromVersionManagerService";

interface Request {
  searchParam?: string;
  pageNumber?: string | number;
}

interface Response {
  releases: any[];
  count: number;
  hasMore: boolean;
}

const ListReleasesService = async ({
  searchParam = "",
  pageNumber = "1"
}: Request): Promise<Response> => {
  // Buscar releases do version-manager
  const result = await ListReleasesFromVersionManagerService({
    searchParam,
    pageNumber
  });

  return result;
};

export default ListReleasesService;

