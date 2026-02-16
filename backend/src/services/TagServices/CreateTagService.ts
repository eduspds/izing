import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";
import User from "../../models/User";
import TagQueues from "../../models/TagQueues";

interface Request {
  tag: string;
  color: string;
  isActive: boolean;
  userId: number;
  tenantId: number | string;
  queueIds?: number[];
}

const CreateTagService = async ({
  tag,
  color,
  isActive,
  userId,
  tenantId,
  queueIds = []
}: Request): Promise<Tag> => {
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

  const tagData = await Tag.create({
    tag,
    color,
    isActive,
    userId,
    tenantId
  });

  // Associar etiqueta aos departamentos se fornecidos
  if (queueIds && queueIds.length > 0) {
    await Promise.all(
      queueIds.map(async (queueId: number) => {
        await TagQueues.create({
          tagId: tagData.id,
          queueId
        });
      })
    );
  }

  return tagData;
};

export default CreateTagService;
