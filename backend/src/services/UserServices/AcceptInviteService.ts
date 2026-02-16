import * as Yup from "yup";
import AppError from "../../errors/AppError";
import User from "../../models/User";

interface ValidateTokenResponse {
  valid: boolean;
  email?: string;
  message?: string;
}

export const validateInviteToken = async (token: string): Promise<ValidateTokenResponse> => {
  if (!token || typeof token !== "string") {
    return { valid: false, message: "Token inválido." };
  }
  const user = await User.findOne({
    where: {
      resetPasswordToken: token,
      accountStatus: "PENDING"
    },
    attributes: ["id", "email", "resetPasswordExpires"]
  });
  if (!user) {
    return { valid: false, message: "Convite não encontrado ou já utilizado." };
  }
  const expires = user.get("resetPasswordExpires") as Date;
  if (!expires || new Date() > expires) {
    return { valid: false, message: "Este convite expirou." };
  }
  return { valid: true, email: user.email };
};

interface AcceptInviteRequest {
  token: string;
  name: string;
  password: string;
}

export const acceptInvite = async ({
  token,
  name,
  password
}: AcceptInviteRequest): Promise<{ id: number; email: string; name: string }> => {
  const validation = await validateInviteToken(token);
  if (!validation.valid) {
    throw new AppError(validation.message || "Token inválido ou expirado.", 400);
  }

  const schema = Yup.object().shape({
    name: Yup.string().required().min(2).max(100),
    password: Yup.string().required().min(6).max(100)
  });
  try {
    await schema.validate({ name, password });
  } catch (err) {
    throw new AppError((err as Error).message);
  }

  const user = await User.findOne({
    where: { resetPasswordToken: token, accountStatus: "PENDING" }
  });
  if (!user) {
    throw new AppError("Convite não encontrado ou já utilizado.", 404);
  }

  await user.update({
    name: name.trim(),
    password,
    accountStatus: "ACTIVE",
    resetPasswordToken: null as any,
    resetPasswordExpires: null as any
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
};
