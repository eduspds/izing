/* eslint-disable no-return-assign */
import type { IBaileysMessageAdapter, MessageLikeMinimal } from "../../types/baileysAdapter";
import socketEmit from "../../helpers/socketEmit";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import Contact from "../../models/Contact";
import CreateMessageSystemService from "../MessageServices/CreateMessageSystemService";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import BuildSendMessageService from "./BuildSendMessageService";
import DefinedUserBotService from "./DefinedUserBotService";
import IsContactTest from "./IsContactTest";
import SendFarewellMessage from "../../helpers/SendFarewellMessage";
import User from "../../models/User";
import UpdateContactService from "../ContactServices/UpdateContactService";
import { validateInput, type ValidationType, type ValidateInputOptions } from "./ChatFlowDataValidation";
import { logger } from "../../utils/logger";

/** Monta payload do ticket com contact buscado do banco (garante nome atualizado no frontend). */
async function buildTicketPayloadForSocket(ticket: Ticket): Promise<Record<string, unknown>> {
  const refreshed = await ticket.reload();
  const ticketPlain =
    typeof (refreshed as any).toJSON === "function"
      ? (refreshed as any).toJSON()
      : { ...(refreshed as any).dataValues };
  const contact = await Contact.findByPk(ticket.contactId, {
    attributes: ["id", "name", "number", "email", "profilePicUrl", "birthDate", "pushname", "isBlocked"]
  });
  const contactPlain = contact && typeof (contact as any).toJSON === "function" ? (contact as any).toJSON() : contact;
  return { ...ticketPlain, contact: contactPlain ?? null } as Record<string, unknown>;
}

/** Dado um contato, retorna a função que acha o primeiro passo "não pulável" a partir de um stepId (corrente de pulos nome/email/data). */
function findFirstNonSkippableStepId(
  nodeList: any[],
  contact: { name?: string; number?: string; email?: string; birthDate?: string } | null
): (startStepId: string) => string {
  const existingName = String(contact?.name ?? "").trim();
  const existingEmail = String(contact?.email ?? "").trim();
  const existingBirthDate = String(contact?.birthDate ?? "").trim();
  const nameDigits = existingName.replace(/\D/g, "");
  const hasRealName = existingName.length >= 2 && !(nameDigits.length >= 10 && /^\d+$/.test(nameDigits));
  const hasValidEmail = existingEmail.includes("@") && existingEmail.length >= 5;

  const wouldSkip = (s: any) => {
    if (!s?.waitForData) return false;
    const tf = s.targetField || "name";
    const isBirth = tf === "birthDate" || ((tf === "Data de Nascimento" || tf === "Data de nascimento") && (s.validationType || "text") === "date");
    if (tf === "name" && hasRealName) return true;
    if (tf === "email" && hasValidEmail) return true;
    if (isBirth && existingBirthDate.length >= 8) return true;
    return false;
  };

  return (startStepId: string) => {
    let currentId: string | null = startStepId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const s = nodeList.find((n: any) => n.id === currentId);
      if (!s) return currentId;
      if (!wouldSkip(s)) return currentId;
      const cond = s.conditions?.find((c: any) => c.action === 0 && c.nextStepId);
      if (!cond?.nextStepId) return currentId;
      currentId = cond.nextStepId;
    }
    return currentId || startStepId;
  };
}

const isNextSteps = async (
  ticket: Ticket,
  chatFlow: any,
  step: any,
  stepCondition: any
): Promise<boolean> => {
  // action = 0: enviar para proximo step: nextStepId
  if (stepCondition.action === 0) {
    const nodesList = [...chatFlow.flow.nodeList];

    // Corrente de pulos: se o próximo passo for "aguardar dado" já preenchido, avançar até o primeiro que não seja
    const contactForSkip = await Contact.findOne({
      where: { id: ticket.contactId, tenantId: ticket.tenantId },
      attributes: ["name", "number", "email", "birthDate"]
    });
    const getLandStepId = findFirstNonSkippableStepId(nodesList, contactForSkip);
    const landStepId = getLandStepId(stepCondition.nextStepId);

    await ticket.update({
      stepChatFlow: landStepId,
      botRetries: 0,
      lastInteractionBot: new Date()
    });

    const nextStep = nodesList.find((n: any) => n.id === landStepId);

    if (!nextStep) return false;

    // Verificar se o próximo step tem condição "Independe de resposta" (US) com ação "Encerramento" (3)
    const hasAutoCloseCondition = nextStep.conditions?.some(
      (condition: any) => condition.type === "US" && condition.action === 3
    );

    // Enviar interações do próximo step (já pode ser o passo "pousado" após pular nome/email/data)
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

      const nodeList = chatFlow.flow?.nodeList;
      if (!Array.isArray(nodeList) || nodeList.length === 0) {
        return;
      }

      const step = nodeList.find(
        (node: any) => node.id === ticket.stepChatFlow
      );

      if (!step) {
        return;
      }

      const flowConfig = nodeList.find(
        (node: any) => node.type === "configurations"
      );

      const conditions = step.conditions;
      if (!Array.isArray(conditions)) {
        return;
      }

      // Etapa "Aguardar Entrada de Dados": validar mensagem, persistir no contato e avançar
      if (step.waitForData && !ticket.isCreated) {
        const targetField = step.targetField || "name";
        const contactForStep = await Contact.findOne({
          where: { id: ticket.contactId, tenantId: ticket.tenantId },
          include: ["extraInfo"],
          attributes: ["id", "name", "number", "email", "birthDate"]
        });
        if (!contactForStep) {
          logger.warn(`[VerifyStepsChatFlowTicket] Contato não encontrado para entrada de dados | ticketId=${ticket.id}`);
          return;
        }
        const existingName = String((contactForStep as any).name ?? "").trim();
        const existingEmail = String((contactForStep as any).email ?? "").trim();
        const existingBirthDate = String((contactForStep as any).birthDate ?? "").trim();

        // Nome "real" = pelo menos 2 caracteres e não é só número de telefone
        const nameDigits = existingName.replace(/\D/g, "");
        const hasRealName =
          existingName.length >= 2 && !(nameDigits.length >= 10 && /^\d+$/.test(nameDigits));
        const hasValidEmail = existingEmail.includes("@") && existingEmail.length >= 5;

        const getLandStepId = findFirstNonSkippableStepId(nodeList, contactForStep);

        const applySkipAndSend = async (firstNextStepId: string) => {
          const landStepId = getLandStepId(firstNextStepId);
          await ticket.update({
            stepChatFlow: landStepId,
            botRetries: 0,
            lastInteractionBot: new Date()
          });
          await ticket.reload();
          const landStep = nodeList.find((n: any) => n.id === landStepId);
          if (landStep?.interactions?.length) {
            await Promise.all(
              landStep.interactions.map((interaction: any) =>
                BuildSendMessageService({ msg: interaction, tenantId: ticket.tenantId, ticket })
              )
            );
          }
          const payload = await buildTicketPayloadForSocket(ticket);
          socketEmit({ tenantId: ticket.tenantId, type: "ticket:update", payload });
        };

        // Etapa "Data de nascimento": pular se já tem data (e seguir em cadeia)
        const isBirthDateStep =
          targetField === "birthDate" ||
          ((targetField === "Data de Nascimento" || targetField === "Data de nascimento") &&
            (step.validationType || "text") === "date");
        if (isBirthDateStep && existingBirthDate.length >= 8) {
          const dataCondition = conditions.find((c: any) => c.action === 0 && c.nextStepId);
          if (dataCondition?.nextStepId) {
            await applySkipAndSend(dataCondition.nextStepId);
          }
          return;
        }

        // Etapa "Nome": pular se já tem nome real (e seguir em cadeia)
        if (targetField === "name" && hasRealName) {
          const dataCondition = conditions.find((c: any) => c.action === 0 && c.nextStepId);
          if (dataCondition?.nextStepId) {
            await applySkipAndSend(dataCondition.nextStepId);
          }
          return;
        }

        // Etapa "E-mail": pular se já tem e-mail válido (e seguir em cadeia)
        if (targetField === "email" && hasValidEmail) {
          const dataCondition = conditions.find((c: any) => c.action === 0 && c.nextStepId);
          if (dataCondition?.nextStepId) {
            await applySkipAndSend(dataCondition.nextStepId);
          }
          return;
        }

        const validationType = (step.validationType || "text") as ValidationType;
        const validationOptions: ValidateInputOptions = { targetField };
        const result = validateInput(String(msg.body ?? "").trim(), validationType, validationOptions);
        if (!result.valid) {
          const errorMessage =
            flowConfig?.configurations?.notOptionsSelectMessage?.message ||
            "Não entendi. Por favor, envie um valor válido.";
          await CreateMessageSystemService({
            msg: {
              body: result.error || errorMessage,
              fromMe: true,
              read: true,
              sendType: "bot",
              ticketId: ticket.id,
              contactId: ticket.contactId,
              tenantId: ticket.tenantId
            },
            tenantId: ticket.tenantId,
            ticket,
            sendType: "bot",
            status: "pending"
          });
          await ticket.update({
            botRetries: (ticket.botRetries || 0) + 1,
            lastInteractionBot: new Date()
          });
          socketEmit({ tenantId: ticket.tenantId, type: "ticket:update", payload: await ticket.reload() });
          return;
        }
        const value = result.value!;
        const currentNumber = String((contactForStep as any).number ?? "").trim();
        const currentExtra = (contactForStep as any).extraInfo ?? [];
        let extraInfo: { id?: number; name: string; value: string }[] = currentExtra.map((e: any) => ({
          id: e.id,
          name: e.name,
          value: e.value
        }));

        // Preservar nome/e-mail ao atualizar só extraInfo: nunca sobrescrever com vazio (evita nome sumir na etapa seguinte)
        const nameToKeep = (existingName || (ticket as any).contact?.name) ?? "";
        const emailToKeep = (existingEmail || (ticket as any).contact?.email) ?? "";

        // Data de nascimento (campo fixo) vai para contact.birthDate; outros customizados vão para extraInfo
        const isDateStep = (step.validationType || "text") === "date";
        const effectiveField =
          targetField === "name" && isDateStep
            ? "Data de nascimento"
            : targetField === "email" && isDateStep
              ? "Data de nascimento"
              : targetField;

        // Atualizar apenas o campo que está sendo preenchido, para não sobrescrever nome/email com vazio
        if (effectiveField === "name") {
          await UpdateContactService({
            contactId: String(ticket.contactId),
            tenantId: ticket.tenantId,
            contactData: { name: value }
          });
        } else if (effectiveField === "email") {
          await UpdateContactService({
            contactId: String(ticket.contactId),
            tenantId: ticket.tenantId,
            contactData: { email: value }
          });
        } else if (isBirthDateStep) {
          await UpdateContactService({
            contactId: String(ticket.contactId),
            tenantId: ticket.tenantId,
            contactData: { birthDate: value }
          });
        } else {
          const idx = extraInfo.findIndex((e: any) => e.name === effectiveField);
          if (idx >= 0) extraInfo[idx] = { ...extraInfo[idx], value };
          else extraInfo.push({ name: effectiveField, value });
          const contactData: any = { number: currentNumber, extraInfo };
          if (nameToKeep.length > 0) contactData.name = nameToKeep;
          if (emailToKeep.length > 0) contactData.email = emailToKeep;
          await UpdateContactService({
            contactId: String(ticket.contactId),
            tenantId: ticket.tenantId,
            contactData
          });
        }
        const dataCondition = conditions.find((c: any) => c.action === 0 && c.nextStepId);
        if (!dataCondition?.nextStepId) {
          logger.warn(`[VerifyStepsChatFlowTicket] Etapa de entrada de dados sem próximo passo | stepId=${step.id}`);
          const payload = await buildTicketPayloadForSocket(ticket);
          socketEmit({ tenantId: ticket.tenantId, type: "ticket:update", payload });
          return;
        }
        await ticket.update({
          stepChatFlow: dataCondition.nextStepId,
          botRetries: 0,
          lastInteractionBot: new Date()
        });
        await ticket.reload();
        const nextStep = nodeList.find((n: any) => n.id === dataCondition.nextStepId);
        if (nextStep?.interactions?.length) {
          await Promise.all(
            nextStep.interactions.map((interaction: any) =>
              BuildSendMessageService({ msg: interaction, tenantId: ticket.tenantId, ticket })
            )
          );
        }
        const payload = await buildTicketPayloadForSocket(ticket);
        socketEmit({ tenantId: ticket.tenantId, type: "ticket:update", payload });
        return;
      }

      // verificar condição com a ação do step
      const stepCondition = conditions.find((conditions: any) => {
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

        // se ticket tiver sido criado, ignorar na primeira passagem
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
        // Evitar reenviar o primeiro passo quando o ticket acabou de ser criado (CheckChatBotFlowWelcome já enviou)
        const ticketCreatedAtMs = ticket.createdAt ? new Date(ticket.createdAt).getTime() : 0;
        const justCreated = ticketCreatedAtMs && Date.now() - ticketCreatedAtMs < 6000;
        if (step.interactions && step.interactions.length > 0 && !justCreated) {
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
