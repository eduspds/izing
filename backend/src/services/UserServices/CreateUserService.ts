import * as Yup from "yup";

import AppError from "../../errors/AppError";
import User from "../../models/User";
import UserManagerQueues from "../../models/UserManagerQueues";
import UsersQueues from "../../models/UsersQueues";

interface Request {
  email: string;
  password: string;
  name: string;
  tenantId: string | number;
  profile?: string;
  managerQueues?: number[];
}

interface Response {
  email: string;
  name: string;
  id: number;
  profile: string;
}

const CreateUserService = async ({
  email,
  password,
  name,
  tenantId,
  profile = "admin",
  managerQueues = []
}: Request): Promise<Response> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    tenantId: Yup.number().required(),
    email: Yup.string()
      .email()
      .required()
      .test(
        "Check-email",
        "An user with this email already exists.",
        async value => {
          const emailExists = await User.findOne({
            where: { email: value! }
          });
          return !emailExists;
        }
      ),
    password: Yup.string().required().min(5)
  });

  try {
    await schema.validate({ email, password, name, tenantId });
  } catch (err) {
    throw new AppError(err.message);
  }

  const user = await User.create({
    email,
    password,
    name,
    profile,
    tenantId
  });

  // Se for gerente, criar relacionamentos com as filas
  if (profile === "manager" && managerQueues.length > 0) {
    await Promise.all(
      managerQueues.map(async (queueId: number) => {
        // Validar se o departamento existe antes de criar o relacionamento
        const Queue = require("../../models/Queue").default;
        const queueExists = await Queue.findOne({
          where: { id: queueId, tenantId }
        });
        
        if (!queueExists) {
          console.warn(
            `Departamento ${queueId} não existe. Ignorando relacionamento de gerente com usuário ${user.id}`
          );
          return;
        }
        
        // Criar relacionamento de gerente
        await UserManagerQueues.create({
          userId: user.id,
          queueId,
          tenantId
        });
        
        // Adicionar automaticamente como membro do departamento
        await UsersQueues.create({
          userId: user.id,
          queueId,
          tenantId
        });
      })
    );
  }

  const serializedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile
  };

  return serializedUser;
};

export default CreateUserService;
