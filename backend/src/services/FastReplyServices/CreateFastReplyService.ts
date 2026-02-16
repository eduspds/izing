import AppError from "../../errors/AppError";
import FastReply from "../../models/FastReply";
import User from "../../models/User";
import FastReplyQueues from "../../models/FastReplyQueues";

interface Request {
  key: string;
  message: string;
  userId: number;
  tenantId: number | string;
  queueIds?: number[];
}

const CreateFastReplyService = async ({
  key,
  message,
  userId,
  tenantId,
  queueIds = []
}: Request): Promise<FastReply> => {
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

  const fastReplyData = await FastReply.create({
    key,
    message,
    userId,
    tenantId
  });

  // Associar mensagem rápida aos departamentos se fornecidos
  if (queueIds && queueIds.length > 0) {
    await Promise.all(
      queueIds.map(async (queueId: number) => {
        await FastReplyQueues.create({
          fastReplyId: fastReplyData.id,
          queueId
        });
      })
    );
  }

  return fastReplyData;
};

export default CreateFastReplyService;
