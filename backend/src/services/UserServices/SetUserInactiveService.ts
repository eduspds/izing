import AppError from "../../errors/AppError";
import User from "../../models/User";
import CheckUserCanBeInactiveService from "./CheckUserCanBeInactiveService";

interface Request {
  userId: number;
  tenantId: number;
  inactiveUntil?: Date | null;
  inactiveReason?: string;
}

const SetUserInactiveService = async ({
  userId,
  tenantId,
  inactiveUntil,
  inactiveReason
}: Request): Promise<User> => {
  const user = await User.findOne({
    where: { id: userId, tenantId }
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  // Verificar se o usuário pode ser inativado
  const checkResult = await CheckUserCanBeInactiveService(userId, tenantId);

  if (!checkResult.canBeInactive) {
    const blockingInfo = checkResult.blockingFlows
      ?.map(
        flow =>
          `Fluxo: ${flow.chatFlowName}, Etapa: ${flow.stepName}`
      )
      .join("; ");

    throw new AppError(
      `Não é possível inativar o usuário. Ele está configurado como destino em fluxos de atendimento. ${blockingInfo || ""}`,
      400
    );
  }

  // Calcular data de inatividade se fornecida em dias
  let inactiveUntilDate: Date | null = null;
  if (inactiveUntil) {
    inactiveUntilDate = inactiveUntil;
  }

  // Atualizar campos de inatividade
  await user.update({
    isInactive: true,
    inactiveUntil: inactiveUntilDate,
    inactiveReason: inactiveReason || null
  });

  await user.reload();

  return user;
};

export default SetUserInactiveService;

