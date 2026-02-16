import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";
import TagQueues from "../../models/TagQueues";
import User from "../../models/User";
import UserManagerQueues from "../../models/UserManagerQueues";

interface TagData {
  tag: string;
  color: string;
  isActive: boolean;
  userId: number;
  tenantId: number | string;
  queueIds?: number[];
}

interface Request {
  tagData: TagData;
  tagId: string;
}

const UpdateTagService = async ({ tagData, tagId }: Request): Promise<Tag> => {
  const { tag, color, isActive, userId, tenantId, queueIds = [] } = tagData;

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

  const tagModel = await Tag.findOne({
    where: { id: tagId, tenantId },
    attributes: ["id", "tag", "color", "isActive", "userId"]
  });

  if (!tagModel) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  await tagModel.update({
    tag,
    color,
    isActive,
    userId
  });

  // Gerenciar departamentos
          // Se for gerente, verificar se pode gerenciar todos os departamentos
          if (user.profile === "manager") {
            // Buscar departamentos atuais da etiqueta
            const currentTagQueues = await TagQueues.findAll({
              where: { tagId: Number(tagId) },
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
            
            if (managesAllQueues) {
              // Gerente gerencia todos os departamentos - pode fazer alteração completa
              await TagQueues.destroy({ where: { tagId: Number(tagId) } });
              
              if (queueIds && queueIds.length > 0) {
                await Promise.all(
                  queueIds.map(async (queueId: number) => {
                    await TagQueues.create({
                      tagId: Number(tagId),
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
              await TagQueues.destroy({ 
                where: { 
                  tagId: Number(tagId),
                  queueId: managerQueueIds
                } 
              });
              
              // Adicionar os novos departamentos que o gerente gerencia
              if (allowedQueueIds && allowedQueueIds.length > 0) {
                await Promise.all(
                  allowedQueueIds.map(async (queueId: number) => {
                    await TagQueues.create({
                      tagId: Number(tagId),
                      queueId
                    });
                  })
                );
              }
            }
          } else {
            // Admin pode fazer alteração completa
            await TagQueues.destroy({ where: { tagId: Number(tagId) } });
            
            if (queueIds && queueIds.length > 0) {
              await Promise.all(
                queueIds.map(async (queueId: number) => {
                  await TagQueues.create({
                    tagId: Number(tagId),
                    queueId
                  });
                })
              );
            }
          }

  await tagModel.reload({
    attributes: ["id", "tag", "color", "isActive", "userId"]
  });

  return tagModel;
};

export default UpdateTagService;
