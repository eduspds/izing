import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import User from "../../models/User";
import UsersQueues from "../../models/UsersQueues";
import UserManagerQueues from "../../models/UserManagerQueues";
import { getIO } from "../../libs/socket";

interface UserQueues {
  id?: number;
  queue?: number;
}

interface UserData {
  email?: string;
  password?: string;
  currentPassword?: string;
  name?: string;
  profile?: string;
  queues?: UserQueues[];
  managerQueues?: number[];
}

interface Request {
  userData: UserData;
  userId: string | number;
  tenantId: string | number;
  requestedBy?: number;
  isAdmin?: boolean;
}

interface Response {
  id: number;
  name: string;
  email: string;
  profile: string;
}

const UpdateUserService = async ({
  userData,
  userId,
  tenantId,
  requestedBy,
  isAdmin = false
}: Request): Promise<Response | undefined> => {
  const user = await User.findOne({
    where: { id: userId, tenantId }
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().email(),
    profile: Yup.string(),
    password: Yup.string().min(6),
    currentPassword: Yup.string()
  });

  const { email, password, currentPassword, profile, name, queues, managerQueues } = userData;

  if (password) {
    if (!currentPassword) {
      throw new AppError("Informe a senha atual para alterar a senha.", 400);
    }
    const isValid = await user.checkPassword(currentPassword);
    if (!isValid) {
      throw new AppError("Senha atual incorreta.", 400);
    }
  }

  const allowedData: UserData = isAdmin
    ? userData
    : { name: userData.name, password: userData.password, currentPassword: userData.currentPassword };
  const { email: emailVal, password: passwordVal, profile: profileVal, name: nameVal, queues: queuesVal, managerQueues: managerQueuesVal } = allowedData;

  // console.log('UpdateUserService - Dados recebidos:', { email, password, profile, name, queues, managerQueues });
  // console.log('UpdateUserService - tenantId do req.user:', tenantId);

  try {
    await schema.validate({ email: emailVal, password: passwordVal, profile: profileVal, name: nameVal });
  } catch (err: unknown) {
    throw new AppError((err as Error)?.message);
  }

  if (isAdmin && queuesVal) {
    await UsersQueues.destroy({ where: { userId } });
    await Promise.all(
      queuesVal.map(async (queue: UserQueues | number) => {
        // Aceitar tanto objetos quanto números
        const queueId: number =
          typeof queue === "number" ? queue : queue?.id || queue?.queue || 0;

        console.log("Processando queue:", {
          queue,
          queueId,
          tipo: typeof queue
        });

        // Validar se o departamento existe antes de criar o relacionamento
        if (queueId > 0) {
          const queueExists = await Queue.findOne({
            where: { id: queueId, tenantId }
          });

          if (queueExists) {
            await UsersQueues.upsert({ queueId, userId });
            console.log(
              `Departamento ${queueId} adicionado ao usuário ${userId}`
            );
          } else {
            console.warn(
              `Departamento ${queueId} não existe. Ignorando relacionamento com usuário ${userId}`
            );
          }
        } else {
          console.warn("Queue ID inválido:", { queue, queueId });
        }
      })
    );
  }

  // Gerenciar filas de gerente (apenas admin)
  if (isAdmin && managerQueuesVal !== undefined) {
    console.log("Gerenciando filas de gerente:", { profile: profileVal, managerQueues: managerQueuesVal });
    console.log("Removendo relacionamentos existentes para userId:", userId);
    await UserManagerQueues.destroy({ where: { userId } });

    if (profileVal === "manager" && managerQueuesVal.length > 0) {
      console.log(
        "Criando relacionamentos de gerente para filas:",
        managerQueuesVal
      );
      await Promise.all(
        managerQueuesVal.map(async (queueId: number) => {
          const finalTenantId = Number(tenantId);

          // Validar se o departamento existe antes de criar o relacionamento
          const queueExists = await Queue.findOne({
            where: { id: queueId, tenantId: finalTenantId }
          });

          if (!queueExists) {
            console.warn(
              `Departamento ${queueId} não existe. Ignorando relacionamento de gerente com usuário ${userId}`
            );
            return;
          }

          console.log("Criando UserManagerQueues:", {
            userId,
            queueId,
            tenantId: finalTenantId
          });

          // Criar relacionamento de gerente
          await UserManagerQueues.create({
            userId: Number(userId),
            queueId,
            tenantId: finalTenantId
          });

          // Verificar se já é membro do departamento, se não for, adicionar automaticamente
          const existingUserQueue = await UsersQueues.findOne({
            where: { userId: Number(userId), queueId }
          });

          if (!existingUserQueue) {
            console.log(
              "Usuário não é membro do departamento, adicionando automaticamente:",
              { userId, queueId }
            );
            await UsersQueues.create({
              userId: Number(userId),
              queueId,
              tenantId: finalTenantId
            });
          }
        })
      );
    } else {
      console.log(
        "Usuário não é mais gerente ou não tem filas para gerenciar. Relacionamentos removidos."
      );
    }
  }

  const updatePayload: Record<string, unknown> = {
    name: nameVal !== undefined ? nameVal : user.name
  };
  if (passwordVal) updatePayload.password = passwordVal;
  if (isAdmin) {
    if (emailVal !== undefined) updatePayload.email = emailVal;
    if (profileVal !== undefined) updatePayload.profile = profileVal;
  }
  await user.update(updatePayload);

  await user.reload({
    attributes: ["id", "name", "email", "profile"],
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "queue"]
      },
      {
        model: Queue,
        as: "managerQueues",
        attributes: ["id", "queue"]
      }
    ]
  });

  const serializedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    queues: user.queues,
    managerQueues: user.managerQueues
  };

  // Emitir socket para atualizar dados do usuário em tempo real
  const io = getIO();
  const room = `${tenantId}:${user.id}`;
  const event = `${tenantId}:user:update`;
  
  io.to(room).emit(event, {
    action: "update",
    user: serializedUser
  });

  return serializedUser;
};


export default UpdateUserService;
