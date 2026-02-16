/* eslint-disable no-return-assign */
import type { IBaileysMessageAdapter, MessageLikeMinimal } from "../../types/baileysAdapter";
import socketEmit from "../../helpers/socketEmit";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import CreateMessageSystemService from "../MessageServices/CreateMessageSystemService";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import BuildSendMessageService from "./BuildSendMessageService";
import DefinedUserBotService from "./DefinedUserBotService";
import IsContactTest from "./IsContactTest";
import SendFarewellMessage from "../../helpers/SendFarewellMessage";
import User from "../../models/User";

const isNextSteps = async (
  ticket: Ticket,
  chatFlow: any,
  step: any,
  stepCondition: any
): Promise<boolean> => {
  // action = 0: enviar para proximo step: nextStepId
  if (stepCondition.action === 0) {
    await ticket.update({
      stepChatFlow: stepCondition.nextStepId,
      botRetries: 0,
      lastInteractionBot: new Date()
    });

    const nodesList = [...chatFlow.flow.nodeList];

    /// pegar os dados do proxumo step
    const nextStep = nodesList.find(
      (n: any) => n.id === stepCondition.nextStepId
    );

    if (!nextStep) return false;

    // Verificar se o próximo step tem condição "Independe de resposta" (US) com ação "Encerramento" (3)
    const hasAutoCloseCondition = nextStep.conditions?.some(
      (condition: any) => condition.type === "US" && condition.action === 3
    );

    // Enviar interações do próximo step
    if (nextStep.interactions && nextStep.interactions.length > 0) {
      await Promise.all(
        nextStep.interactions.map((interaction: any) =>
          BuildSendMessageService({
            msg: interaction,
            tenantId: ticket.tenantId,
            ticket
          })
        )
      );
    }

    // Se tem condição de encerramento automático, fechar o ticket imediatamente
    if (hasAutoCloseCondition) {
      // Encontrar a condição de encerramento para enviar a mensagem
      const closeCondition = nextStep.conditions.find(
        (condition: any) => condition.type === "US" && condition.action === 3
      );

      // Enviar mensagem de encerramento se definida
      if (closeCondition?.closeMessage && closeCondition.closeMessage.trim()) {
        const messageData = {
          body: closeCondition.closeMessage,
          fromMe: true,
          read: true,
          sendType: "bot"
        };

        await CreateMessageSystemService({
          msg: messageData,
          tenantId: ticket.tenantId,
          ticket,
          sendType: messageData.sendType,
          status: "pending"
        });
      }

      // Verificar se é fluxo de avaliação para limpar campos específicos
      const isEvaluationFlow =
        ticket.isEvaluationFlow && ticket.status === "pending_evaluation";

      const updateData: any = {
        chatFlowId: null,
        stepChatFlow: null,
        botRetries: 0,
        lastInteractionBot: new Date(),
        unreadMessages: 0,
        answered: false,
        status: "closed",
        closedAt: new Date().getTime()
      };

      if (isEvaluationFlow) {
        updateData.isEvaluationFlow = false;
        updateData.evaluationStartedAt = null;
      }

      await ticket.update(updateData);

      await CreateLogTicketService({
        ticketId: ticket.id,
        type: isEvaluationFlow ? "evaluationCompleted" : "flowClosed"
      });

      socketEmit({
        tenantId: ticket.tenantId,
        type: "ticket:update",
        payload: ticket
      });

      return true; // Indica que o ticket foi fechado
    }
    // await SetTicketMessagesAsRead(ticket);
  }
  return false;
};

const isQueueDefine = async (
  ticket: Ticket,
  flowConfig: any,
  step: any,
  stepCondition: any
): Promise<void> => {
  // action = 1: enviar para fila: queue
  if (stepCondition.action === 1) {
    ticket.update({
      queueId: stepCondition.queueId,
      chatFlowId: null,
      stepChatFlow: null,
      botRetries: 0,
      lastInteractionBot: new Date()
    });

    // Buscar informações da fila para incluir no log
    const queue = await Queue.findByPk(stepCondition.queueId);
    const queueName = queue?.queue || "Fila desconhecida";

    await CreateLogTicketService({
      ticketId: ticket.id,
      type: "queue",
      queueId: stepCondition.queueId,
      description: `Bot definiu a fila: ${queueName}`,
      metadata: {
        queueId: stepCondition.queueId,
        queueName,
        flowConfigId: flowConfig?.id
      }
    });

    if (flowConfig?.configurations?.autoDistributeTickets) {
      await DefinedUserBotService(
        ticket,
        stepCondition.queueId,
        ticket.tenantId,
        flowConfig?.configurations?.autoDistributeTickets
      );
      ticket.reload();
    }

    socketEmit({
      tenantId: ticket.tenantId,
      type: "ticket:update",
      payload: ticket
    });
  }
};

const isUserDefine = async (
  ticket: Ticket,
  step: any,
  stepCondition: any
): Promise<void> => {
  // action = 2: enviar para determinado usuário
  if (stepCondition.action === 2) {
    // Verificar se o usuário está inativo
    const targetUser = await User.findOne({
      where: {
        id: stepCondition.userIdDestination,
        tenantId: ticket.tenantId
      }
    });

    if (targetUser) {
      const isInactive = targetUser.isInactive === true;
      let isInactiveByDate = false;
      if (targetUser.inactiveUntil) {
        isInactiveByDate = new Date(targetUser.inactiveUntil) > new Date();
      }

      if (isInactive && (targetUser.inactiveUntil === null || isInactiveByDate)) {
        // Usuário está inativo, não atribuir e registrar log de erro
        await CreateLogTicketService({
          ticketId: ticket.id,
          type: "userDefine",
          description: `Tentativa de transferência para usuário inativo (ID: ${stepCondition.userIdDestination}) bloqueada`
        });
        return; // Não atribuir o ticket
      }
    }

    ticket.update({
      userId: stepCondition.userIdDestination,
      // status: "pending",
      chatFlowId: null,
      stepChatFlow: null,
      botRetries: 0,
      lastInteractionBot: new Date()
    });

    ticket.reload();

    socketEmit({
      tenantId: ticket.tenantId,
      type: "ticket:update",
      payload: ticket
    });

    await CreateLogTicketService({
      userId: stepCondition.userIdDestination,
      ticketId: ticket.id,
      type: "userDefine"
    });
  }
};

const isCloseTicket = async (
  ticket: Ticket,
  step: any,
  stepCondition: any
): Promise<void> => {
  // action = 3: encerrar ticket
  if (stepCondition.action === 3) {
    // Enviar mensagem de encerramento se definida
    if (stepCondition.closeMessage && stepCondition.closeMessage.trim()) {
      const messageData = {
        body: stepCondition.closeMessage,
        fromMe: true,
        read: true,
        sendType: "bot"
      };

      await CreateMessageSystemService({
        msg: messageData,
        tenantId: ticket.tenantId,
        ticket,
        sendType: messageData.sendType,
        status: "pending"
      });
    }

    await ticket.update({
      chatFlowId: null,
      stepChatFlow: null,
      botRetries: 0,
      lastInteractionBot: new Date(),
      unreadMessages: 0,
      answered: false,
      status: "closed",
      closedAt: new Date().getTime()
    });

    await CreateLogTicketService({
      ticketId: ticket.id,
      type: "flowClosed"
    });

    socketEmit({
      tenantId: ticket.tenantId,
      type: "ticket:update",
      payload: ticket
    });
  }
};

// enviar mensagem de boas vindas à fila ou usuário
const sendWelcomeMessage = async (
  ticket: Ticket,
  flowConfig: any
): Promise<void> => {
  if (flowConfig?.configurations?.welcomeMessage?.message) {
    const messageData = {
      body: flowConfig.configurations?.welcomeMessage.message,
      fromMe: true,
      read: true,
      sendType: "bot"
    };

    await CreateMessageSystemService({
      msg: messageData,
      tenantId: ticket.tenantId,
      ticket,
      sendType: messageData.sendType,
      status: "pending"
    });
  }
};

const isRetriesLimit = async (
  ticket: Ticket,
  flowConfig: any
): Promise<boolean> => {
  // verificar o limite de retentativas e realizar ação
  const maxRetryNumber = flowConfig?.configurations?.maxRetryBotMessage?.number;
  if (
    flowConfig?.configurations?.maxRetryBotMessage &&
    maxRetryNumber &&
    ticket.botRetries >= maxRetryNumber - 1
  ) {
    const destinyType = flowConfig.configurations.maxRetryBotMessage.type;
    const { destiny } = flowConfig.configurations.maxRetryBotMessage;
    const updatedValues: any = {
      chatFlowId: null,
      stepChatFlow: null,
      botRetries: 0,
      lastInteractionBot: new Date()
    };
    const logsRetry: any = {
      ticketId: ticket.id,
      type: destinyType === 1 ? "retriesLimitQueue" : "retriesLimitUserDefine"
    };

    // enviar para fila
    if (destinyType === 1 && destiny) {
      updatedValues.queueId = destiny;
      logsRetry.queueId = destiny;
    }
    // enviar para usuario
    if (destinyType === 2 && destiny) {
      updatedValues.userId = destiny;
      logsRetry.userId = destiny;
    }

    ticket.update(updatedValues);
    socketEmit({
      tenantId: ticket.tenantId,
      type: "ticket:update",
      payload: ticket
    });
    await CreateLogTicketService(logsRetry);

    // enviar mensagem de boas vindas à fila ou usuário
    await sendWelcomeMessage(ticket, flowConfig);
    return true;
  }
  return false;
};

const isAnswerCloseTicket = async (
  flowConfig: any,
  ticket: Ticket,
  message: string
): Promise<boolean> => {
  if (
    !flowConfig?.configurations?.answerCloseTicket ||
    flowConfig?.configurations?.answerCloseTicket?.length < 1
  ) {
    return false;
  }

  // verificar condição com a ação
  const params = flowConfig.configurations.answerCloseTicket.find(
    (condition: any) => {
      return (
        String(condition).toLowerCase().trim() ===
        String(message).toLowerCase().trim()
      );
    }
  );

  if (params) {
    await ticket.update({
      chatFlowId: null,
      stepChatFlow: null,
      botRetries: 0,
      lastInteractionBot: new Date(),
      unreadMessages: 0,
      answered: false,
      status: "closed"
    });

    await CreateLogTicketService({
      ticketId: ticket.id,
      type: "autoClose"
    });

    socketEmit({
      tenantId: ticket.tenantId,
      type: "ticket:update",
      payload: ticket
    });

    return true;
  }
  return false;
};

const VerifyStepsChatFlowTicket = async (
  msg: IBaileysMessageAdapter | MessageLikeMinimal,
  ticket: Ticket | any
): Promise<void> => {
  let celularTeste; // ticket.chatFlow?.celularTeste;

  // Verificar se é um fluxo de avaliação
  const isEvaluationFlow =
    ticket.isEvaluationFlow && ticket.status === "pending_evaluation";

  if (
    ticket.chatFlowId &&
    (ticket.status === "pending" || isEvaluationFlow) &&
    !msg.fromMe &&
    !ticket.isGroup &&
    (!ticket.answered || isEvaluationFlow)
  ) {
    if (ticket.chatFlowId) {
      const chatFlow = await ticket.getChatFlow();
      if (chatFlow.celularTeste) {
        celularTeste = chatFlow.celularTeste.replace(/\s/g, ""); // retirar espaços
      }

      const step = chatFlow.flow.nodeList.find(
        (node: any) => node.id === ticket.stepChatFlow
      );

      const flowConfig = chatFlow.flow.nodeList.find(
        (node: any) => node.type === "configurations"
      );

      // verificar condição com a ação do step
      const stepCondition = step.conditions.find((conditions: any) => {
        if (conditions.type === "US") return true;
        const newConditions = conditions.condition.map((c: any) =>
          String(c).toLowerCase().trim()
        );
        const message = String(msg.body ?? "").toLowerCase().trim();
        return newConditions.includes(message);
      });

      if (
        !ticket.isCreated &&
        (await isAnswerCloseTicket(flowConfig, ticket, msg.body ?? ""))
      )
        return;

      if (stepCondition && !ticket.isCreated) {
        // await CreateAutoReplyLogsService(stepAutoReplyAtual, ticket, msg.body);
        // Verificar se rotina em teste
        if (
          await IsContactTest(
            ticket.contact.number,
            celularTeste,
            ticket.channel
          )
        )
          return;

        // action = 0: enviar para proximo step: nextStepId
        const ticketClosed = await isNextSteps(
          ticket,
          chatFlow,
          step,
          stepCondition
        );

        // Se o ticket foi fechado no próximo step, não processar outras ações
        if (ticketClosed) {
          socketEmit({
            tenantId: ticket.tenantId,
            type: "ticket:update",
            payload: ticket
          });
          return;
        }

        // action = 1: enviar para fila: queue
        await isQueueDefine(ticket, flowConfig, step, stepCondition);

        // action = 2: enviar para determinado usuário
        await isUserDefine(ticket, step, stepCondition);

        // action = 3: encerrar ticket
        await isCloseTicket(ticket, step, stepCondition);

        // LÓGICA ESPECIAL PARA FLUXO DE AVALIAÇÃO
        if (isEvaluationFlow) {
          let shouldCloseTicket = false;

          // Fecha se ação for 1 ou 2 (redirecionar para fila/usuário)
          if (stepCondition.action === 1 || stepCondition.action === 2) {
            shouldCloseTicket = true;
          }
          // Fecha se ação 0 (próximo step) mas não tem nextStepId ou o step não existe
          else if (stepCondition.action === 0) {
            if (!stepCondition.nextStepId) {
              shouldCloseTicket = true;
            } else {
              // Verificar se o próximo step realmente existe
              const nextStepExists = chatFlow.flow.nodeList.find(
                (n: any) =>
                  n.id === stepCondition.nextStepId && n.type === "node"
              );
              if (!nextStepExists) {
                shouldCloseTicket = true;
              }
            }
          }

          if (shouldCloseTicket) {
            await ticket.update({
              status: "closed",
              closedAt: new Date().getTime(),
              chatFlowId: null,
              stepChatFlow: null,
              isEvaluationFlow: false,
              evaluationStartedAt: null,
              botRetries: 0
            });

            await CreateLogTicketService({
              ticketId: ticket.id,
              type: "evaluationCompleted"
            });

            // Enviar mensagem de despedida (farewell message)
            await SendFarewellMessage({
              ticket,
              tenantId: ticket.tenantId,
              userId: ticket.userId
            });

            // Recarregar ticket para ter dados atualizados
            await ticket.reload();
          }
        }

        socketEmit({
          tenantId: ticket.tenantId,
          type: "ticket:update",
          payload: ticket
        });

        if (stepCondition.action === 1 || stepCondition.action === 2) {
          await sendWelcomeMessage(ticket, flowConfig);
        }
      } else {
        // CASO ESPECIAL: Fluxo de avaliação sem condição correspondente
        if (isEvaluationFlow) {
          // Se é fluxo de avaliação e não há condição correspondente,
          // significa que o cliente respondeu algo inesperado ou é o fim do fluxo
          // Vamos fechar o ticket para não ficar preso em pending_evaluation
          await ticket.update({
            status: "closed",
            closedAt: new Date().getTime(),
            chatFlowId: null,
            stepChatFlow: null,
            isEvaluationFlow: false,
            evaluationStartedAt: null,
            botRetries: 0
          });

          await CreateLogTicketService({
            ticketId: ticket.id,
            type: "evaluationCompleted"
          });

          // Enviar mensagem de despedida
          await SendFarewellMessage({
            ticket,
            tenantId: ticket.tenantId,
            userId: ticket.userId
          });

          await ticket.reload();

          socketEmit({
            tenantId: ticket.tenantId,
            type: "ticket:update",
            payload: ticket
          });

          return;
        }

        // Verificar se rotina em teste
        if (
          await IsContactTest(
            ticket.contact.number,
            celularTeste,
            ticket.channel
          )
        )
          return;

        // se ticket tiver sido criado, ingnorar na primeria passagem
        if (!ticket.isCreated) {
          if (await isRetriesLimit(ticket, flowConfig)) return;

          const messageData = {
            body:
              flowConfig.configurations.notOptionsSelectMessage.message ||
              "Desculpe! Não entendi sua resposta. Vamos tentar novamente! Escolha uma opção válida.",
            fromMe: true,
            read: true,
            sendType: "bot"
          };
          await CreateMessageSystemService({
            msg: messageData,
            tenantId: ticket.tenantId,
            ticket,
            sendType: messageData.sendType,
            status: "pending"
          });

          // tratar o número de retentativas do bot
          await ticket.update({
            botRetries: ticket.botRetries + 1,
            lastInteractionBot: new Date()
          });
        }
        if (step.interactions && step.interactions.length > 0) {
          await Promise.all(
            step.interactions.map((interaction: any) =>
              BuildSendMessageService({
                msg: interaction,
                tenantId: ticket.tenantId,
                ticket
              })
            )
          );
        }
      }
      // await SetTicketMessagesAsRead(ticket);
      // await SetTicketMessagesAsRead(ticket);
    }
  }
};

export default VerifyStepsChatFlowTicket;
