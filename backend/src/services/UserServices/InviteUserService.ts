import * as Yup from "yup";
import { v4 as uuidV4 } from "uuid";
import AppError from "../../errors/AppError";
import User from "../../models/User";
import UserManagerQueues from "../../models/UserManagerQueues";
import UsersQueues from "../../models/UsersQueues";
import UserPermission from "../../models/UserPermission";
import Permission from "../../models/Permission";
import { sendMail, buildInviteEmailHtml } from "../../libs/mail";
import GetMailConfigFromSettings from "../../helpers/GetMailConfigFromSettings";
import { logger } from "../../utils/logger";

const INVITE_EXPIRES_HOURS = 24;
const DEFAULT_PERMISSION_NAMES = ["dashboard-all-view", "contacts-access", "atendimento-access"];

interface Request {
  email: string;
  profile?: string;
  permissionIds?: number[];
  managerQueues?: number[];
  tenantId: string | number;
}

interface Response {
  id: number;
  email: string;
  accountStatus: string;
  message: string;
}

const InviteUserService = async ({
  email,
  profile = "user",
  permissionIds = [],
  managerQueues = [],
  tenantId
}: Request): Promise<Response> => {
  const schema = Yup.object().shape({
    email: Yup.string()
      .email()
      .required()
      .test(
        "Check-email",
        "Já existe um usuário com este e-mail.",
        async value => {
          const exists = await User.findOne({ where: { email: value! } });
          return !exists;
        }
      ),
    tenantId: Yup.number().required()
  });

  try {
    await schema.validate({ email, tenantId });
  } catch (err) {
    throw new AppError((err as Error).message);
  }

  const token = uuidV4();
  const expires = new Date();
  expires.setHours(expires.getHours() + INVITE_EXPIRES_HOURS);

  const user = await User.create({
    email: email.trim().toLowerCase(),
    name: email.split("@")[0],
    profile,
    tenantId,
    accountStatus: "PENDING",
    resetPasswordToken: token,
    resetPasswordExpires: expires,
    password: uuidV4()
  });

  const defaultPerms = await Permission.findAll({
    where: { name: DEFAULT_PERMISSION_NAMES },
    attributes: ["id"]
  });
  const allPermIds = [...new Set([...defaultPerms.map(p => p.id), ...permissionIds])];
  await UserPermission.bulkCreate(allPermIds.map(permissionId => ({ userId: user.id, permissionId })));

  if (profile === "manager" && managerQueues.length > 0) {
    const Queue = require("../../models/Queue").default;
    for (const queueId of managerQueues) {
      const queueExists = await Queue.findOne({ where: { id: queueId, tenantId } });
      if (queueExists) {
        await UserManagerQueues.create({ userId: user.id, queueId, tenantId });
        await UsersQueues.create({ userId: user.id, queueId, tenantId });
      }
    }
  }

  const mailSettings = await GetMailConfigFromSettings(tenantId);
  const baseUrl =
    mailSettings.frontUrl ||
    process.env.FRONT_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8080";
  const inviteLink = `${baseUrl.replace(/\/$/, "")}/#/invite?token=${token}`;
  const mailConfig =
    mailSettings.user
      ? {
          from: mailSettings.from || mailSettings.user,
          host: mailSettings.host || "smtp.gmail.com",
          port: mailSettings.port || 587,
          user: mailSettings.user,
          pass: mailSettings.pass || ""
        }
      : undefined;
  const sent = await sendMail({
    to: user.email,
    subject: "Convite para acessar o sistema",
    html: buildInviteEmailHtml(inviteLink),
    config: mailConfig
  });

  if (!sent) {
    logger.info(`[InviteUserService] Convite criado para ${user.email} - link: ${inviteLink}`);
  }

  return {
    id: user.id,
    email: user.email,
    accountStatus: user.accountStatus,
    emailSent: sent,
    inviteLink,
    message: sent ? "Convite enviado por e-mail." : "Convite criado. Copie o link e envie ao convidado."
  };
};

export default InviteUserService;
