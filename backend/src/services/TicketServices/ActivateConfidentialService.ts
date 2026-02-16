import Ticket from "../../models/Ticket";
import User from "../../models/User";
import Queue from "../../models/Queue";
import UsersQueues from "../../models/UsersQueues";
import AppError from "../../errors/AppError";
import ValidatePasswordService from "../UserServices/ValidatePasswordService";
import { getIO } from "../../libs/socket";

interface Request {
  ticketId: number;
  userId: number;
  password: string;
  tenantId: number;
}

const ActivateConfidentialService = async ({
  ticketId,
  userId,
  password,
  tenantId
}: Request): Promise<Ticket> => {
  // Validar senha
  await ValidatePasswordService({ userId, password, tenantId });

  // Buscar ticket
  const ticket = await Ticket.findOne({
    where: { id: ticketId, tenantId },
    include: [{ model: Queue, as: "queue" }]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // Verificar se usuário pertence a departamento com sigilo habilitado
  const userQueues = await UsersQueues.findAll({
    where: { userId },
    include: [
      {
        model: Queue,
        as: "queue",
        where: { tenantId, isConfidential: true, isActive: true }
      }
    ]
  });

  if (!userQueues || userQueues.length === 0) {
    throw new AppError("ERR_NO_PERMISSION_CONFIDENTIAL", 403);
  }

  // Verificar se ticket já tem sigilo ativo
  if (ticket.isConfidential) {
    throw new AppError("ERR_CONFIDENTIAL_ALREADY_ACTIVE", 400);
  }

  // Ativar sigilo
  await ticket.update({
    isConfidential: true,
    confidentialUserId: userId
  });

  const io = getIO();
  io.to(`${tenantId}:${ticketId}`).emit(`${tenantId}:ticket`, {
    action: "update",
    ticket
  });

  return ticket;
};

export default ActivateConfidentialService;

