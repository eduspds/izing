import Tag from "../../models/Tag";
import TagQueues from "../../models/TagQueues";
import UserManagerQueues from "../../models/UserManagerQueues";
import User from "../../models/User";
import AppError from "../../errors/AppError";

interface Request {
  id: string;
  tenantId: number | string;
  userId: number;
}

const DeleteTagService = async ({ id, tenantId, userId }: Request): Promise<void> => {
  const tag = await Tag.findOne({
    where: { id, tenantId }
  });

  if (!tag) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  // Verificar perfil do usuário
  const user = await User.findOne({
    where: { id: userId, tenantId },
    attributes: ["id", "profile"]
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  if (user.profile === "manager") {
    // Para gerentes, verificar se podem apagar todos os departamentos
    const currentTagQueues = await TagQueues.findAll({
      where: { tagId: Number(id) },
      attributes: ["queueId"]
    });
    
    const currentQueueIds = currentTagQueues.map(tq => tq.queueId);
    
    // Buscar departamentos que o gerente gerencia
    const managerQueues = await UserManagerQueues.findAll({
      where: { userId },
      attributes: ["queueId"]
    });
    
    const managerQueueIds = managerQueues.map(mq => mq.queueId);
    
    // Verificar se o gerente gerencia TODOS os departamentos atuais
    const managesAllQueues = currentQueueIds.every(queueId => 
      managerQueueIds.includes(queueId)
    );
    
    if (!managesAllQueues) {
      throw new AppError("ERR_MANAGER_CANNOT_DELETE_SHARED_TAG - Esta etiqueta está associada a departamentos que você não gerencia. Você pode apenas remover os departamentos que administra.", 400);
    }
    
    // Se gerencia todos os departamentos, remover apenas os departamentos que gerencia
    await TagQueues.destroy({ 
      where: { 
        tagId: Number(id),
        queueId: managerQueueIds
      } 
    });
    
    // Verificar se ainda restam departamentos
    const remainingQueues = await TagQueues.findAll({
      where: { tagId: Number(id) },
      attributes: ["queueId"]
    });
    
    if (remainingQueues.length === 0) {
      // Não restam departamentos, pode apagar a etiqueta
      try {
        await tag.destroy();
      } catch (error) {
        throw new AppError("ERR_TAG_CONTACTS_EXISTS", 400);
      }
    }
  } else {
    // Admin pode apagar completamente
    try {
      await tag.destroy();
    } catch (error) {
      throw new AppError("ERR_TAG_CONTACTS_EXISTS", 400);
    }
  }
};

export default DeleteTagService;
