import UserManagerQueues from "../../models/UserManagerQueues";
import UsersQueues from "../../models/UsersQueues";
import Queue from "../../models/Queue";

/**
 * Serviço para garantir que todos os gerentes sejam membros dos departamentos que gerenciam
 *
 * Problema: Gerentes existentes podem estar em UserManagerQueues mas não em UsersQueues
 * Solução: Verificar e adicionar automaticamente os gerentes como membros dos departamentos
 */
const FixManagerDepartmentMembership = async (): Promise<void> => {
  try {
    console.log("Verificando consistência de gerentes e departamentos...");

    // Buscar todos os relacionamentos de gerentes com departamentos
    const managerQueues = await UserManagerQueues.findAll({
      attributes: ["userId", "queueId", "tenantId"]
    });

    if (managerQueues.length === 0) {
      console.log("Nenhum gerente encontrado. Verificação concluída.");
      return;
    }

    console.log(
      `Encontrados ${managerQueues.length} relacionamentos de gerentes com departamentos`
    );

    let addedCount = 0;
    let alreadyExistsCount = 0;

    // Para cada relacionamento, verificar se o gerente é membro do departamento
    await Promise.all(
      managerQueues.map(async managerQueue => {
        const { userId, queueId, tenantId } = managerQueue;

        // Verificar se o departamento existe
        const queueExists = await Queue.findOne({
          where: { id: queueId, tenantId }
        });

        if (!queueExists) {
          console.warn(
            `Departamento ${queueId} não existe. Pulando relacionamento com usuário ${userId}`
          );
          return;
        }

        // Verificar se já existe em UsersQueues
        const existingUserQueue = await UsersQueues.findOne({
          where: { userId, queueId }
        });

        if (!existingUserQueue) {
          // Não existe, criar o relacionamento
          console.log(
            `Adicionando gerente ${userId} como membro do departamento ${queueId}`
          );

          await UsersQueues.create({
            userId,
            queueId,
            tenantId
          });

          addedCount += 1;
        } else {
          alreadyExistsCount += 1;
        }
      })
    );

    console.log(
      `Verificação concluída: ${addedCount} gerentes adicionados, ${alreadyExistsCount} já eram membros`
    );
  } catch (error) {
    console.error(
      "Erro ao verificar consistência de gerentes e departamentos:",
      error
    );
    // Não lançar erro para não impedir o backend de iniciar
  }
};

export default FixManagerDepartmentMembership;
