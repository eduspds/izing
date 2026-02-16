import Ticket from "../../models/Ticket";
import ChatFlow from "../../models/ChatFlow";
import Whatsapp from "../../models/Whatsapp";
import socketEmit from "../../helpers/socketEmit";
import BuildSendMessageService from "./BuildSendMessageService";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";

interface Request {
  ticket: Ticket;
  userId?: number | string;
}

const StartEvaluationFlowService = async ({
  ticket,
  userId
}: Request): Promise<boolean> => {
  // Buscar a conexão para ver se tem fluxo de avaliação configurado
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId, {
    include: [
      {
        model: ChatFlow,
        as: "evaluationChatFlow",
        where: { isActive: true, isDeleted: false },
        required: false
      }
    ]
  });

  // Se não tiver fluxo de avaliação configurado, retornar false
  if (!whatsapp?.evaluationChatFlowId || !whatsapp.evaluationChatFlow) {
    return false;
  }

  const evaluationFlow = whatsapp.evaluationChatFlow;

  // Buscar o primeiro node do fluxo de avaliação
  const nodeList = evaluationFlow.flow?.nodeList;
  if (!nodeList || nodeList.length === 0) {
    return false;
  }

  // Encontrar o primeiro node (não-configuração)
  const firstNode = nodeList.find(
    (node: any) => node.type === "node" && node.interactions?.length > 0
  );

  if (!firstNode) {
    return false;
  }

  // Atualizar o ticket para estado de avaliação
  await ticket.update({
    status: "pending_evaluation",
    isEvaluationFlow: true,
    evaluationStartedAt: new Date().getTime(),
    chatFlowId: evaluationFlow.id,
    stepChatFlow: firstNode.id,
    botRetries: 0,
    lastInteractionBot: new Date()
  });

  // Criar log
  await CreateLogTicketService({
    ticketId: ticket.id,
    userId,
    type: "evaluationStarted"
  });

  // Enviar as mensagens do primeiro node
  for (const interaction of firstNode.interactions) {
    await BuildSendMessageService({
      msg: interaction,
      tenantId: ticket.tenantId,
      ticket
    });
  }

  // Emitir atualização do ticket
  socketEmit({
    tenantId: ticket.tenantId,
    type: "ticket:update",
    payload: ticket
  });

  return true;
};

export default StartEvaluationFlowService;

