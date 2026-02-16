import Queue from "../../models/Queue";

interface Request {
  tenantId: string | number;
  userId?: number;
  userProfile?: string;
}
const ListQueueService = async ({ tenantId, userId, userProfile }: Request): Promise<Queue[]> => {
  // Retornar todos os departamentos para todos os perfis (admin, manager, user)
  // Isso permite que qualquer usuário veja todos os departamentos ao transferir tickets
  const queueData = await Queue.findAll({
    where: {
      tenantId
    },
    order: [["queue", "ASC"]]
  });

  return queueData;
};

export default ListQueueService;
