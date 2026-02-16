import AppError from "../../errors/AppError";
import FastReply from "../../models/FastReply";
import FastReplyQueues from "../../models/FastReplyQueues";
import User from "../../models/User";
import UserManagerQueues from "../../models/UserManagerQueues";

interface FastReplyData {
  key: string;
  message: string;
  userId: number;
  tenantId: number | string;
  queueIds?: number[];
}

interface Request {
  fastReplyData: FastReplyData;
  fastReplyId: string;
}

const UpdateFastReplyService = async ({
  fastReplyData,
  fastReplyId
}: Request): Promise<FastReply> => {
  const { key, message, userId, tenantId, queueIds = [] } = fastReplyData;

  // Buscar informações do usuário para verificar se é gerente
  const user = await User.findOne({
    where: { id: userId, tenantId },
    attributes: ["id", "profile"]
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  // Se o usuário for gerente, deve associar a pelo menos um departamento
  if (user.profile === "manager" && (!queueIds || queueIds.length === 0)) {
    throw new AppError("ERR_MANAGER_MUST_ASSOCIATE_DEPARTMENT", 400);
  }

  const fastReplyModel = await FastReply.findOne({
    where: { id: fastReplyId, tenantId },
    attributes: ["id", "key", "message", "userId"]
  });

  if (!fastReplyModel) {
    throw new AppError("ERR_NO_FAST_REPLY_FOUND", 404);
  }

  await fastReplyModel.update({
    key,
    message,
    userId
  });

  // Gerenciar departamentos
          // Se for gerente, verificar se pode gerenciar todos os departamentos
          if (user.profile === "manager") {
            // Buscar departamentos atuais da mensagem rápida
            const currentFastReplyQueues = await FastReplyQueues.findAll({
              where: { fastReplyId: Number(fastReplyId) },
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
            
            if (managesAllQueues) {
              // Gerente gerencia todos os departamentos - pode fazer alteração completa
              await FastReplyQueues.destroy({ where: { fastReplyId: Number(fastReplyId) } });
              
              if (queueIds && queueIds.length > 0) {
                await Promise.all(
                  queueIds.map(async (queueId: number) => {
                    await FastReplyQueues.create({
                      fastReplyId: Number(fastReplyId),
                      queueId
                    });
                  })
                );
              }
            } else {
              // Gerente não gerencia todos os departamentos - só pode alterar os seus
              const allowedQueueIds = queueIds.filter(queueId => 
                managerQueueIds.includes(queueId)
              );
              
              // Remover apenas os departamentos que o gerente gerencia
              await FastReplyQueues.destroy({ 
                where: { 
                  fastReplyId: Number(fastReplyId),
                  queueId: managerQueueIds
                } 
              });
              
              // Adicionar os novos departamentos que o gerente gerencia
              if (allowedQueueIds && allowedQueueIds.length > 0) {
                await Promise.all(
                  allowedQueueIds.map(async (queueId: number) => {
                    await FastReplyQueues.create({
                      fastReplyId: Number(fastReplyId),
                      queueId
                    });
                  })
                );
              }
            }
          } else {
            // Admin pode fazer alteração completa
            await FastReplyQueues.destroy({ where: { fastReplyId: Number(fastReplyId) } });
            
            if (queueIds && queueIds.length > 0) {
              await Promise.all(
                queueIds.map(async (queueId: number) => {
                  await FastReplyQueues.create({
                    fastReplyId: Number(fastReplyId),
                    queueId
                  });
                })
              );
            }
          }

  await fastReplyModel.reload({
    attributes: ["id", "key", "message", "userId"]
  });

  return fastReplyModel;
};

export default UpdateFastReplyService;
