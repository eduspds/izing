import Ticket from "../../models/Ticket";
import ValidatePasswordService from "../UserServices/ValidatePasswordService";
import AppError from "../../errors/AppError";

interface Request {
  ticketId: number;
  userId: number;
  password: string;
  tenantId: number;
}

const ShowConfidentialService = async ({
  ticketId,
  userId,
  password,
  tenantId
}: Request): Promise<{ success: boolean; message: string }> => {
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

  // Verificar se há mensagens sigilosas
  if (!ticket.confidentialUserId) {
    throw new AppError("ERR_NO_CONFIDENTIAL_MESSAGES", 400);
  }

  return {
    success: true,
    message: "Confidential messages access granted"
  };
};

export default ShowConfidentialService;


