import Ticket from "../../models/Ticket";
import ValidatePasswordService from "../UserServices/ValidatePasswordService";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";

interface Request {
  ticketId: number;
  userId: number;
  password: string;
  tenantId: number;
}

const DeactivateConfidentialService = async ({
  ticketId,
  userId,
  password,
  tenantId
}: Request): Promise<Ticket> => {
  // Validar senha
  await ValidatePasswordService({ userId, password, tenantId });

  // Buscar ticket
  const ticket = await Ticket.findOne({
    where: { id: ticketId, tenantId }
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // Verificar se usuário é o que ativou o sigilo
  if (ticket.confidentialUserId !== userId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  // Verificar se sigilo está ativo
  if (!ticket.isConfidential) {
    throw new AppError("ERR_CONFIDENTIAL_NOT_ACTIVE", 400);
  }

  // Desativar sigilo (mas manter histórico)
  await ticket.update({
    isConfidential: false
    // confidentialUserId permanece para histórico
  });

  const io = getIO();
  io.to(`${tenantId}:${ticketId}`).emit(`${tenantId}:ticket`, {
    action: "update",
    ticket
  });

  return ticket;
};

export default DeactivateConfidentialService;


