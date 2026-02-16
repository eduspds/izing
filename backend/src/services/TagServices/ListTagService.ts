import Tag from "../../models/Tag";
import Queue from "../../models/Queue";
import User from "../../models/User";
import UserManagerQueues from "../../models/UserManagerQueues";
import { Op } from "sequelize";

interface Request {
  tenantId: string | number;
  isActive?: string | boolean | null;
  userId?: number;
  userProfile?: string;
}

const ListTagService = async ({
  tenantId,
  isActive,
  userId,
  userProfile
}: Request): Promise<Tag[]> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    tenantId
  };

  if (isActive) {
    where.isActive = isActive;
  }

  // Lógica de filtro baseada no perfil do usuário
  let includeOptions: any = [
    {
      model: Queue,
      as: "queues",
      attributes: ["id", "queue"],
      through: { attributes: [] }
    }
  ];

  // Se for gerente, filtrar apenas etiquetas dos seus departamentos + etiquetas globais
  if (userProfile === "manager" && userId) {
    // Buscar departamentos que o gerente gerencia
    const managerQueues = await UserManagerQueues.findAll({
      where: { userId },
      attributes: ["queueId"]
    });
    
    const managerQueueIds = managerQueues.map(mq => mq.queueId);
    
    // Buscar todas as etiquetas com seus departamentos
    const tagData = await Tag.findAll({
      where,
      include: [
        {
          model: Queue,
          as: "queues",
          attributes: ["id", "queue"],
          through: { attributes: [] },
          required: false // Incluir etiquetas sem departamentos (globais)
        }
      ],
      order: [["tag", "ASC"]]
    });

    // Filtrar no código: incluir etiquetas onde PELO MENOS UM departamento pertence ao gerente
    const filteredData = tagData.filter(tag => {
      // Se não tem departamentos associados (etiqueta global), INCLUIR para todos
      if (!tag.queues || tag.queues.length === 0) {
        return true;
      }
      
      // Se tem departamentos, verificar se PELO MENOS UM pertence ao gerente
      const hasManagerQueue = tag.queues.some(queue => 
        managerQueueIds.includes(queue.id)
      );
      
      return hasManagerQueue;
    });

    // Adicionar informação sobre departamentos não gerenciados pelo gerente
    const enrichedData = filteredData.map(tag => {
      const tagObj = tag.toJSON() as any;
      
      // Identificar departamentos que o gerente NÃO gerencia
      const unmanagedQueues = tag.queues.filter(queue => 
        !managerQueueIds.includes(queue.id)
      );
      
      // Adicionar informação sobre departamentos não gerenciados
      tagObj.unmanagedQueues = unmanagedQueues.map(queue => ({
        id: queue.id,
        queue: queue.queue
      }));
      
      return tagObj;
    });

    return enrichedData as any;
  }

  const tagData = await Tag.findAll({
    where,
    include: includeOptions,
    order: [["tag", "ASC"]]
  });

  return tagData;
};

export default ListTagService;
