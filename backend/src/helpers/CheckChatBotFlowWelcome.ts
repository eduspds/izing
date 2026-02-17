import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Setting from "../models/Setting";
import ChatFlow from "../models/ChatFlow";
import CreateLogTicketService from "../services/TicketServices/CreateLogTicketService";
import IsContactTest from "../services/ChatFlowServices/IsContactTest";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import BuildSendMessageService from "../services/ChatFlowServices/BuildSendMessageService";
import { logger } from "../utils/logger";

const CheckChatBotFlowWelcome = async (instance: Ticket): Promise<void> => {
  if (instance.userId || instance.isGroup) return;

  const setting = await Setting.findOne({
    where: {
      key: "botTicketActive",
      tenantId: instance.tenantId
    }
  });

  const channel = await ShowWhatsAppService({
    id: instance.whatsappId,
    tenantId: instance.tenantId
  });

  const chatFlowId = channel?.chatFlowId || setting?.value;

  if (!chatFlowId) {
    logger.debug("[CheckChatBotFlowWelcome] Sem chatFlowId no canal nem em botTicketActive – ignorando");
    return;
  }

  const chatFlow = await ChatFlow.findOne({
    where: {
      id: +chatFlowId,
      tenantId: instance.tenantId,
      isActive: true,
      isDeleted: false
    }
  });

  if (!chatFlow) {
    logger.warn("[CheckChatBotFlowWelcome] Fluxo não encontrado ou inativo – chatFlowId=" + chatFlowId);
    return;
  }

  const contato = await Contact.findByPk(instance.contactId);
  const { celularTeste } = chatFlow;
  const celularContato = contato?.number;

  if (await IsContactTest(celularContato, celularTeste, instance.channel))
    return;

  const lineList = chatFlow.flow?.lineList;
  const nodeListForStart = chatFlow.flow?.nodeList;
  const startNode = Array.isArray(nodeListForStart)
    ? nodeListForStart.find((n: any) => n.type === "start")
    : null;
  const startId = startNode?.id ?? "start";
  const lineFlow = Array.isArray(lineList)
    ? lineList.find((line: any) => line.from === "start" || line.from === startId)
    : null;

  if (!lineFlow?.to) {
    logger.warn("[CheckChatBotFlowWelcome] Nenhuma linha do início no fluxo (lineList/from start) – flowId=" + chatFlow.id);
    return;
  }

  logger.info("[CheckChatBotFlowWelcome] Ativando fluxo ticketId=" + instance.id + " stepChatFlow=" + lineFlow.to);

  await instance.update({
    chatFlowId: chatFlow.id,
    stepChatFlow: lineFlow.to,
    lastInteractionBot: new Date()
  });

  await CreateLogTicketService({
    ticketId: instance.id,
    type: "chatBot"
  });

  const nodeList = chatFlow.flow?.nodeList;
  const firstStep = Array.isArray(nodeList)
    ? nodeList.find((n: any) => n.id === lineFlow.to)
    : null;

  if (!firstStep?.interactions?.length) {
    logger.warn("[CheckChatBotFlowWelcome] Primeiro passo sem interações – stepId=" + lineFlow.to);
    return;
  }

  try {
    const ticketWithContact = await ShowTicketService({
      id: instance.id,
      tenantId: instance.tenantId
    });
    logger.info("[CheckChatBotFlowWelcome] Enviando " + firstStep.interactions.length + " interação(ões) do primeiro passo");
    for (const interaction of firstStep.interactions) {
      await BuildSendMessageService({
        msg: interaction,
        tenantId: instance.tenantId,
        ticket: ticketWithContact
      });
    }
  } catch (err) {
    logger.error("[CheckChatBotFlowWelcome] Erro ao enviar interações do primeiro passo:", err);
  }
};

export default CheckChatBotFlowWelcome;
