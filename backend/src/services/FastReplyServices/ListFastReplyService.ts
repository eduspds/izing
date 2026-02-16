import FastReply from "../../models/FastReply";
import Queue from "../../models/Queue";
import User from "../../models/User";
import UserManagerQueues from "../../models/UserManagerQueues";
import { Op } from "sequelize";

interface Request {
  tenantId: string | number;
  userId?: number;
  userProfile?: string;
}

const ListFastReplyService = async ({
  tenantId,
  userId,
  userProfile
}: Request): Promise<FastReply[]> => {
  // Lógica de filtro baseada no perfil do usuário
  let includeOptions: any = [
    {
      model: Queue,
      as: "queues",
      attributes: ["id", "queue"],
      through: { attributes: [] }
    }
  ];

  // Se for gerente, filtrar apenas mensagens rápidas dos seus departamentos + mensagens globais
  if (userProfile === "manager" && userId) {
    // Buscar departamentos que o gerente gerencia
    const managerQueues = await UserManagerQueues.findAll({
      where: { userId },
      attributes: ["queueId"]
    });
    
    const managerQueueIds = managerQueues.map(mq => mq.queueId);
    
    // Buscar mensagens rápidas que são globais (sem departamentos) ou dos departamentos do gerente
    const fastReplyData = await FastReply.findAll({
      where: {
        tenantId
      },
      include: [
        {
          model: Queue,
          as: "queues",
          attributes: ["id", "queue"],
          through: { attributes: [] },
          required: false // Incluir mensagens sem departamentos (globais)
        }
      ],
      order: [["key", "ASC"]]
    });

    // Filtrar no código: incluir mensagens onde PELO MENOS UM departamento pertence ao gerente
    const filteredData = fastReplyData.filter(fastReply => {
      // Se não tem departamentos associados (mensagem global), INCLUIR para todos
      if (!fastReply.queues || fastReply.queues.length === 0) {
        return true;
      }
      
      // Se tem departamentos, verificar se PELO MENOS UM pertence ao gerente
      const hasManagerQueue = fastReply.queues.some(queue => 
        managerQueueIds.includes(queue.id)
      );
      
      return hasManagerQueue;
    });

    // Adicionar informação sobre departamentos não gerenciados pelo gerente
    const enrichedData = filteredData.map(fastReply => {
      const fastReplyObj = fastReply.toJSON() as any;
      
      // Identificar departamentos que o gerente NÃO gerencia
      const unmanagedQueues = fastReply.queues.filter(queue => 
        !managerQueueIds.includes(queue.id)
      );
      
      // Adicionar informação sobre departamentos não gerenciados
      fastReplyObj.unmanagedQueues = unmanagedQueues.map(queue => ({
        id: queue.id,
        queue: queue.queue
      }));
      
      return fastReplyObj;
    });

    return enrichedData as any;
  }

  const fastReplyData = await FastReply.findAll({
    where: {
      tenantId
    },
    include: includeOptions,
    order: [["key", "ASC"]]
  });

  return fastReplyData;
};

export default ListFastReplyService;
