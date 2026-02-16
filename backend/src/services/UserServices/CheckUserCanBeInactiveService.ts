import ChatFlow from "../../models/ChatFlow";
import { Op } from "sequelize";

interface Response {
  canBeInactive: boolean;
  blockingFlows?: Array<{
    chatFlowId: number;
    chatFlowName: string;
    stepName: string;
    stepId: string;
  }>;
}

const CheckUserCanBeInactiveService = async (
  userId: number,
  tenantId: number
): Promise<Response> => {
  // Buscar todos os fluxos ativos do tenant
  const chatFlows = await ChatFlow.findAll({
    where: {
      tenantId,
      isActive: true,
      isDeleted: false
    },
    attributes: ["id", "name", "flow"]
  });

  const blockingFlows: Array<{
    chatFlowId: number;
    chatFlowName: string;
    stepName: string;
    stepId: string;
  }> = [];

  // Verificar cada fluxo para ver se o usuário está configurado como destino
  for (const chatFlow of chatFlows) {
    const flow = chatFlow.flow;
    
    if (!flow || !flow.nodeList || !Array.isArray(flow.nodeList)) {
      continue;
    }

    // Verificar cada nó do tipo "node" no fluxo
    for (const node of flow.nodeList) {
      if (node.type !== "node") {
        continue;
      }

      // Verificar condições do nó
      if (node.conditions && Array.isArray(node.conditions)) {
        for (const condition of node.conditions) {
          // action === 2 significa "enviar para usuário"
          // Comparar convertendo ambos para número para garantir compatibilidade
          const conditionUserId = Number(condition.userIdDestination);
          if (condition.action === 2 && conditionUserId === userId) {
            blockingFlows.push({
              chatFlowId: Number(chatFlow.id),
              chatFlowName: chatFlow.name || "Fluxo desconhecido",
              stepName: node.name || "Etapa sem nome",
              stepId: node.id
            });
            break; // Já encontrou uma condição neste nó, não precisa verificar as outras
          }
        }
      }
    }

    // Verificar também nas configurações do fluxo (maxRetryBotMessage)
    const configNode = flow.nodeList.find((n: any) => n.type === "configurations");
    if (configNode?.configurations?.maxRetryBotMessage) {
      const maxRetry = configNode.configurations.maxRetryBotMessage;
      // type === 2 significa "usuário"
      const maxRetryUserId = Number(maxRetry.destiny);
      if (maxRetry.type === 2 && maxRetryUserId === userId) {
        blockingFlows.push({
          chatFlowId: Number(chatFlow.id),
          chatFlowName: chatFlow.name || "Fluxo desconhecido",
          stepName: "Configuração de Retentativas",
          stepId: "configurations"
        });
      }
    }

    // Verificar também notResponseMessage nas configurações
    if (configNode?.configurations?.notResponseMessage) {
      const notResponse = configNode.configurations.notResponseMessage;
      // type === 2 significa "usuário"
      const notResponseUserId = Number(notResponse.destiny);
      if (notResponse.type === 2 && notResponseUserId === userId) {
        blockingFlows.push({
          chatFlowId: Number(chatFlow.id),
          chatFlowName: chatFlow.name || "Fluxo desconhecido",
          stepName: "Configuração de Sem Resposta",
          stepId: "configurations"
        });
      }
    }
  }

  if (blockingFlows.length === 0) {
    return {
      canBeInactive: true
    };
  }

  return {
    canBeInactive: false,
    blockingFlows
  };
};

export default CheckUserCanBeInactiveService;

