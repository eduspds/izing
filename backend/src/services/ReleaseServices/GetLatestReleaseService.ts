import GetLatestReleaseFromVersionManagerService from "./GetLatestReleaseFromVersionManagerService";

interface Response {
  release: {
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
  } | null;
}

const GetLatestReleaseService = async (): Promise<Response> => {
  // Buscar release do version-manager
  const release = await GetLatestReleaseFromVersionManagerService();

  return { release };
};

export default GetLatestReleaseService;

