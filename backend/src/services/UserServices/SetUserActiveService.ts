import AppError from "../../errors/AppError";
import User from "../../models/User";

interface Request {
  userId: number;
  tenantId: number;
}

const SetUserActiveService = async ({
  userId,
  tenantId
}: Request): Promise<User> => {
  const user = await User.findOne({
    where: { id: userId, tenantId }
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  // Limpar campos de inatividade
  await user.update({
    isInactive: false,
    inactiveUntil: null,
    inactiveReason: null
  });

  await user.reload();

  return user;
};

export default SetUserActiveService;









