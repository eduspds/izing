import GetReleaseFromVersionManagerService from "./GetReleaseFromVersionManagerService";

interface Request {
  id: number;
}

interface Response {
  release: any;
}

const GetReleaseService = async ({ id }: Request): Promise<Response> => {
  // Buscar release do version-manager
  const release = await GetReleaseFromVersionManagerService(id);

  return { release };
};

export default GetReleaseService;

