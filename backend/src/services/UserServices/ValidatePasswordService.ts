import User from "../../models/User";
import AppError from "../../errors/AppError";

interface Request {
  userId: number;
  password: string;
  tenantId: number;
}

const ValidatePasswordService = async ({
  userId,
  password,
  tenantId
}: Request): Promise<boolean> => {
  const user = await User.findOne({
    where: { id: userId, tenantId }
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  const isValid = await user.checkPassword(password);

  if (!isValid) {
    throw new AppError("ERR_INVALID_PASSWORD", 401);
  }

  return true;
};

export default ValidatePasswordService;


