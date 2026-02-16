import { Op } from "sequelize";
import User from "../../models/User";
import Setting from "../../models/Setting";
import { GetConfigService } from "./InternalChatConfigService";

interface ListAvailableContactsRequest {
  userId: number;
  tenantId: number | string;
}

interface ContactUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  isOnline: boolean;
  lastOnline?: Date;
  queues?: any[];
}

const ListAvailableContactsService = async ({
  userId,
  tenantId
}: ListAvailableContactsRequest): Promise<ContactUser[]> => {
  // Buscar configuração do chat interno
  const config = await GetConfigService({ tenantId: Number(tenantId) });
  const restrictionType = config.communicationRestriction;
  // Valores possíveis:
  // - "none": Sem restrição - todos podem conversar com todos
  // - "sameQueue": Apenas usuários do mesmo departamento
  // - "sameProfile": Apenas usuários do mesmo perfil (admin com admin, user com user)
  // - "custom": Lógica customizada futura

  let availableUsers: User[] = [];

  // Buscar o usuário atual para pegar suas filas
  const currentUser = await User.findByPk(userId, {
    include: [
      {
        association: "queues",
        attributes: ["id"]
      }
    ]
  });

  if (!currentUser) {
    return [];
  }

  const currentUserQueueIds = currentUser.queues?.map(q => q.id) || [];

  switch (restrictionType) {
    case "sameQueue":
      // Listar apenas usuários que compartilham pelo menos uma fila
      if (currentUserQueueIds.length > 0) {
        availableUsers = await User.findAll({
          where: {
            id: { [Op.ne]: userId }, // Excluir o próprio usuário
            tenantId
          },
          include: [
            {
              association: "queues",
              where: {
                id: { [Op.in]: currentUserQueueIds }
              },
              attributes: ["id"],
              required: true
            }
          ],
          attributes: ["id", "name", "email", "profile", "isOnline", "lastOnline"],
          order: [["name", "ASC"]]
        });
      } else {
        // Se usuário não tem filas, pode conversar com todos
        availableUsers = await User.findAll({
          where: {
            id: { [Op.ne]: userId },
            tenantId
          },
          attributes: ["id", "name", "email", "profile", "isOnline", "lastOnline"],
          order: [["name", "ASC"]]
        });
      }
      break;

    case "sameProfile":
      // Listar apenas usuários do mesmo perfil
      availableUsers = await User.findAll({
        where: {
          id: { [Op.ne]: userId },
        tenantId,
        profile: currentUser.profile
      },
      attributes: ["id", "name", "email", "profile", "isOnline", "lastOnline"],
        order: [["name", "ASC"]]
      });
      break;

    case "none":
    default:
      // Sem restrição - listar todos os usuários do tenant (exceto o próprio)
      availableUsers = await User.findAll({
      where: {
        id: { [Op.ne]: userId },
        tenantId
      },
      attributes: ["id", "name", "email", "profile", "isOnline", "lastOnline"],
      order: [["name", "ASC"]]
    });
    break;
  }

  return availableUsers.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    profile: u.profile,
    isOnline: u.isOnline || false,
    lastOnline: u.lastOnline,
    queues: u.queues || []
  }));
};

export default ListAvailableContactsService;

