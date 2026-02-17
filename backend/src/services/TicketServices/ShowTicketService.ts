import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Queue from "../../models/Queue";

interface Request {
  id: string | number;
  tenantId: string | number;
  userId?: number;
  userProfile?: string;
}
const ShowTicketService = async ({
  id,
  tenantId,
  userId,
  userProfile
}: Request): Promise<Ticket> => {
  const ticket = await Ticket.findByPk(id, {
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "email", "profilePicUrl", "pushname", "isUser", "isWAContact", "isGroup", "tenantId", "createdAt", "updatedAt", "isBlocked"],
        include: [
          {
            association: "extraInfo",
            attributes: ["id", "name", "value", "contactId", "createdAt", "updatedAt"]
          },
          {
            association: "tags",
            attributes: ["id", "tag", "color", "isActive", "userId", "tenantId", "createdAt", "updatedAt"],
            through: {
              attributes: [] // Remove todos os campos da tabela de relacionamento ContactTag
            }
          },
          {
            association: "wallets",
            attributes: ["id", "name"],
            through: {
              attributes: [] // Remove todos os campos da tabela de relacionamento ContactWallet
            }
          }
        ]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        association: "whatsapp",
        attributes: ["id", "name"]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "queue"]
      },
      {
        model: User,
        as: "confidentialUser",
        attributes: ["id", "name"]
      }
    ]
  });

  if (!ticket || ticket.tenantId !== tenantId) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // Verificar se ticket está em modo sigiloso e se outro usuário está usando
  if (ticket.isConfidential && userId) {
    const isAdmin = userProfile === "admin";
    const isConfidentialUser = ticket.confidentialUserId === userId;
    
    // Se não é admin e não é o autor do sigilo, bloquear acesso
    if (!isAdmin && !isConfidentialUser) {
      throw new AppError("ERR_TICKET_CONFIDENTIAL_IN_USE", 403);
    }
  }

  // Se o ticket é sigiloso e o usuário é o autor, restaurar showConfidentialMessages
  if (ticket.isConfidential && userId && ticket.confidentialUserId === userId) {
    ticket.setDataValue("showConfidentialMessages", true);
  } else {
    ticket.setDataValue("showConfidentialMessages", false);
  }

  return ticket;
};

export default ShowTicketService;
