import User from "../../models/User";
import AppError from "../../errors/AppError";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import Queue from "../../models/Queue";

interface Request {
  email: string;
  password: string;
}

interface Response {
  user: User;
  token: string;
  refreshToken: string;
  usuariosOnline?: User[];
}

const AuthUserService = async ({
  email,
  password
}: Request): Promise<Response> => {
  const user = await User.findOne({
    where: { email },
    include: [
      { model: Queue, as: "queues" },
      { model: Queue, as: "managerQueues" }
    ]
  });

  if (!user) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  const accountStatus = (user as any).accountStatus;
  if (accountStatus === "PENDING") {
    throw new AppError("Conta pendente. Acesse o link do convite no e-mail para ativar.", 403);
  }

  if (!(await user.checkPassword(password))) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  const token = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  await user.update({
    isOnline: true,
    status: "online",
    lastLogin: new Date()
  });

  const usuariosOnline = await User.findAll({
    where: { tenantId: user.tenantId, isOnline: true },
    attributes: ["id", "email", "status", "lastOnline", "name", "lastLogin"]
  });

  return {
    user,
    token,
    refreshToken,
    usuariosOnline
  };
};

export default AuthUserService;
