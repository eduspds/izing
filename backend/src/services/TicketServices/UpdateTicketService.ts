import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import socketEmit from "../../helpers/socketEmit";
import CreateLogTicketService from "./CreateLogTicketService";
import EndConversation from "../../models/EndConversation";
import CreateMensagemTransferencia from "../MensagemTransferencia/CreateMensagemTransferencia";
import StartEvaluationFlowService from "../ChatFlowServices/StartEvaluationFlowService";
import { Op } from "sequelize";

interface TicketData {
  status?: string;
  userId?: number;
  tenantId: number | string;
  queueId?: number | null;
  autoReplyId?: number | string | null;
  stepAutoReplyId?: number | string | null;
  endConversationObservation?: string;
  sendEvaluation?: boolean;
  origin?: string;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  isTransference?: string | boolean | null;
  userIdRequest: number | string;
  endConversationId?: number;
  endConversationObservation?: string;
  mensagemTransferencia?: string;
  sendEvaluation?: boolean;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId,
  isTransference,
  userIdRequest,
  endConversationId,
  endConversationObservation,
  mensagemTransferencia
}: Request): Promise<Response> => {
  const { status, userId, tenantId, queueId } = ticketData;

  const ticket = await Ticket.findOne({
    where: { id: ticketId, tenantId },
    include: [
      {
        model: Contact,
        as: "contact",
        include: [
          "extraInfo",
          "tags",
          {
            association: "wallets",
            attributes: ["id", "name"]
          }
        ]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        association: "whatsapp",
        attributes: ["id", "name"]
      },
      {
        model: EndConversation,
        as: "endConversation",
        attributes: ["id", "message"]
      }
    ]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  await SetTicketMessagesAsRead(ticket);

  // Variavel para notificar usuário de novo contato como pendente
  const toPending =
    ticket.status !== "pending" && ticketData.status === "pending";

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id);
  }

  // verificar se o front envia close e substituir por closed
  const statusData = status === "close" ? "closed" : status;

  // VALIDAÇÃO: Impedir alteração de status de tickets fechados
  // Tickets fechados não podem ter o status alterado, exceto em casos muito específicos
  // (como reabertura manual explícita, que deve ser uma ação separada)
  if (oldStatus === "closed" && statusData && statusData !== "closed") {
    throw new AppError(
      "Não é possível alterar o status de um ticket fechado. O ticket deve permanecer fechado.",
      400
    );
  }

  // VALIDAÇÃO: Impedir atribuição de usuário em tickets fechados
  if (oldStatus === "closed" && userId && userId !== oldUserId) {
    throw new AppError(
      "Não é possível atribuir um ticket fechado a outro usuário. O ticket deve permanecer fechado.",
      400
    );
  }

  // VALIDAÇÃO: Verificar se o usuário está inativo antes de atribuir
  if (userId && userId !== oldUserId) {
    const targetUser = await User.findOne({
      where: {
        id: userId,
        tenantId
      }
    });

    if (targetUser) {
      // Verificar se está inativo
      const isInactive = targetUser.isInactive === true;
      
      // Verificar se a data de inatividade ainda é válida (se houver)
      let isInactiveByDate = false;
      if (targetUser.inactiveUntil) {
        isInactiveByDate = new Date(targetUser.inactiveUntil) > new Date();
      }

      if (isInactive && (targetUser.inactiveUntil === null || isInactiveByDate)) {
        throw new AppError(
          "Não é possível transferir ticket para usuário inativo.",
          400
        );
      }
    }
  }

  // VERIFICAR SE DEVE INICIAR FLUXO DE AVALIAÇÃO
  // Por padrão, sendEvaluation é true (se não for enviado)
  const shouldSendEvaluation = ticketData.sendEvaluation !== false;

  if (
    statusData === "closed" &&
    !ticket.isEvaluationFlow &&
    shouldSendEvaluation
  ) {
    // Tentar iniciar fluxo de avaliação
    const evaluationStarted = await StartEvaluationFlowService({
      ticket,
      userId: userIdRequest
    });

    // Se iniciou a avaliação, retornar o ticket sem fechar
    if (evaluationStarted) {
      await ticket.reload();
      socketEmit({
        tenantId,
        type: "ticket:update",
        payload: ticket
      });
      return { ticket, oldStatus, oldUserId };
    }
  }

  const data: Record<string, unknown> = {
    status: statusData,
    queueId,
    userId,
    endConversationObservation
  };

  // Se for uma transferência, atualizar o updatedAt para que o ticket apareça no topo
  if (isTransference) {
    data.updatedAt = new Date();
  }

  // se atendimento for encerrado, informar data da finalização
  if (statusData === "closed") {
    data.closedAt = new Date().getTime();
    // Atualizar updatedAt para que o ticket encerrado apareça no topo
    data.updatedAt = new Date();
    // Limpar campos de avaliação ao fechar definitivamente
    data.isEvaluationFlow = false;
    data.evaluationStartedAt = null;
    data.chatFlowId = null;
    data.stepChatFlow = null;
    // Desativar sigilo ao encerrar (mas manter histórico)
    if (ticket.isConfidential) {
      data.isConfidential = false;
    }
  }

  // Desativar sigilo ao transferir ticket
  if (isTransference && ticket.isConfidential) {
    data.isConfidential = false;
  }

  // se iniciar atendimento, retirar o bot e informar a data
  if (oldStatus === "pending" && statusData === "open") {
    data.autoReplyId = null;
    data.stepAutoReplyId = null;
    data.startedAttendanceAt = new Date().getTime();
    // Atualizar updatedAt para que o ticket apareça no topo quando for atendido
    data.updatedAt = new Date();
  }

  if (endConversationId) {
    data.endConversationId = endConversationId;
  }

  if (mensagemTransferencia) {
    await CreateMensagemTransferencia({
      mensagemTransferencia,
      ticketId: Number(ticketId)
    });
  }

  await ticket.update(data);

  // logar o inicio do atendimento
  if (oldStatus === "pending" && statusData === "open") {
    const { origin } = ticketData;
    const descriptionParts = [
      `Iniciou atendimento do ticket. Status: ${oldStatus} → ${statusData}`
    ];
    const metadata = {
      oldStatus,
      newStatus: statusData,
      oldUserId,
      newUserId: userId,
      origin: origin || null
    };

    if (origin === "contacts") {
      descriptionParts.push("Origem: tela de contatos");
    }

    await CreateLogTicketService({
      userId: userIdRequest,
      ticketId,
      type: "open",
      queueId: ticket.queueId,
      description: `${descriptionParts.join(" ")}`,
      metadata
    });

    if (origin === "contacts") {
      await CreateLogTicketService({
        userId: userIdRequest,
        ticketId,
        type: "contactsAttended",
        description: "Atendimento iniciado pela tela de contatos",
        metadata: {
          origin,
          oldStatus,
          newStatus: statusData,
          oldUserId,
          newUserId: userId
        }
      });
    } else if (origin === "support") {
      await CreateLogTicketService({
        userId: userIdRequest,
        ticketId,
        type: "supportAttended",
        description: "Atendimento de suporte iniciado pelo painel",
        metadata: {
          origin,
          oldStatus,
          newStatus: statusData,
          oldUserId,
          newUserId: userId
        }
      });
    }
  }

  // logar ticket resolvido
  if (statusData === "closed") {
    await CreateLogTicketService({
      userId: userIdRequest,
      ticketId,
      type: "closed",
      queueId: ticket.queueId,
      description: `Encerrou o ticket. Status anterior: ${oldStatus}`,
      metadata: {
        oldStatus,
        newStatus: statusData,
        endConversationId,
        endConversationObservation
      }
    });
  }

  // logar ticket retornado à pendente
  if (oldStatus === "open" && statusData === "pending") {
    await CreateLogTicketService({
      userId: userIdRequest,
      ticketId,
      type: "pending",
      queueId: ticket.queueId,
      description: `Retornou ticket para fila de pendentes. Status: ${oldStatus} → ${statusData}`,
      metadata: {
        oldStatus,
        newStatus: statusData,
        oldUserId
      }
    });
  }

  // Log de mudança de fila
  const oldQueueId = ticket.queueId;
  if (queueId && queueId !== oldQueueId) {
    await CreateLogTicketService({
      userId: userIdRequest,
      ticketId,
      type: "queueChanged",
      queueId,
      fromQueueId: oldQueueId,
      description: "Alterou fila do ticket",
      metadata: {
        oldQueueId,
        newQueueId: queueId
      }
    });
  }

  // Log de atribuição a usuário
  if (userId && userId !== oldUserId && !isTransference) {
    await CreateLogTicketService({
      userId: userIdRequest,
      ticketId,
      type: "assignedToUser",
      toUserId: userId,
      queueId: ticket.queueId,
      description: "Atribuiu ticket a outro usuário",
      metadata: {
        oldUserId,
        newUserId: userId
      }
    });
  }

  if (isTransference) {
    // tranferiu o atendimento
    await CreateLogTicketService({
      userId: userIdRequest,
      ticketId,
      type: "transfered",
      toUserId: userId,
      queueId: queueId || ticket.queueId,
      fromQueueId: oldQueueId,
      description: `Transferiu atendimento${
        userId ? " para outro usuário" : ""
      }${queueId && queueId !== oldQueueId ? " e alterou fila" : ""}`,
      metadata: {
        oldUserId,
        newUserId: userId,
        oldQueueId,
        newQueueId: queueId,
        mensagemTransferencia
      }
    });
    // recebeu o atendimento tansferido
    if (userId) {
      await CreateLogTicketService({
        userId,
        ticketId,
        type: "receivedTransfer",
        queueId: queueId || ticket.queueId,
        description: "Recebeu atendimento por transferência",
        metadata: {
          fromUserId: userIdRequest,
          oldQueueId,
          newQueueId: queueId,
          mensagemTransferencia
        }
      });
    }
  }

  await ticket.reload();

  if (isTransference) {
    await ticket.setDataValue("isTransference", true);
  }

  if (toPending) {
    socketEmit({
      tenantId,
      type: "notification:new",
      payload: ticket
    });
  }

  socketEmit({
    tenantId,
    type: "ticket:update",
    payload: ticket
  });

  return { ticket, oldStatus, oldUserId };
};

export default UpdateTicketService;
