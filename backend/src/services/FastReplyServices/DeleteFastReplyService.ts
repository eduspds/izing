import AppError from "../../errors/AppError";
import FastReply from "../../models/FastReply";
import FastReplyQueues from "../../models/FastReplyQueues";
import UserManagerQueues from "../../models/UserManagerQueues";
import User from "../../models/User";

interface Request {
  id: string;
  tenantId: number | string;
  userId: number;
}

const DeleteFastReplyService = async ({
  id,
  tenantId,
  userId
}: Request): Promise<void> => {
  const reply = await FastReply.findOne({
    where: { id, tenantId }
  });

  if (!reply) {
    throw new AppError("ERR_NO_FAST_REPLY_FOUND", 404);
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
    const currentFastReplyQueues = await FastReplyQueues.findAll({
      where: { fastReplyId: Number(id) },
      attributes: ["queueId"]
    });
    
    const currentQueueIds = currentFastReplyQueues.map(frq => frq.queueId);
    
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
      throw new AppError("ERR_MANAGER_CANNOT_DELETE_SHARED_FAST_REPLY - Esta mensagem rápida está associada a departamentos que você não gerencia. Você pode apenas remover os departamentos que administra.", 400);
    }
    
    // Se gerencia todos os departamentos, remover apenas os departamentos que gerencia
    await FastReplyQueues.destroy({ 
      where: { 
        fastReplyId: Number(id),
        queueId: managerQueueIds
      } 
    });
    
    // Verificar se ainda restam departamentos
    const remainingQueues = await FastReplyQueues.findAll({
      where: { fastReplyId: Number(id) },
      attributes: ["queueId"]
    });
    
    if (remainingQueues.length === 0) {
      // Não restam departamentos, pode apagar a mensagem
      try {
        await reply.destroy();
      } catch (error) {
        throw new AppError("ERR_FAST_REPLY_EXISTS", 400);
      }
    }
  } else {
    // Admin pode apagar completamente
    try {
      await reply.destroy();
    } catch (error) {
      throw new AppError("ERR_FAST_REPLY_EXISTS", 400);
    }
  }
};

export default DeleteFastReplyService;
