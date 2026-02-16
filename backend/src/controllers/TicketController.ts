import { Request, Response } from "express";
import { Op } from "sequelize";
import * as Yup from "yup";
// import GetWbotMessage from "../helpers/GetWbotMessage";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import CreateLogTicketService from "../services/TicketServices/CreateLogTicketService";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowLogTicketService from "../services/TicketServices/ShowLogTicketService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import ActivateConfidentialService from "../services/TicketServices/ActivateConfidentialService";
import DeactivateConfidentialService from "../services/TicketServices/DeactivateConfidentialService";
import ShowConfidentialService from "../services/TicketServices/ShowConfidentialService";
import AppError from "../errors/AppError";
import EndConversation from "../models/EndConversation";
import MensagemTransferencia from "../models/TransferConversation";
import SendFarewellMessage from "../helpers/SendFarewellMessage";
import ListTicketsReportService from "../services/TicketServices/ListTicketsReportService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string[];
  date: string;
  showAll: string;
  withUnreadMessages: string;
  queuesIds: string[];
  isNotAssignedUser: string;
  includeNotQueueDefined: string;
  whatsappId: string;
  orderBy: string;
};

interface TicketData {
  contactId: number;
  status: string;
  userId: number;
  isActiveDemand: boolean;
  tenantId: string | number;
  channel: string;
  channelId?: number;
  endConversationId?: number;
  endConversationObservation?: string;
  origin?: string;
}

type ReportQuery = {
  dateStart: string;
  dateEnd: string;
  status: string;
  userIds: string[];
  queueIds: string[];
  tags: string[];
  whatsappId: string;
  closeReasonIds: string[];
  page: string;
  pageSize: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId, profile } = req.user;
  const {
    searchParam,
    pageNumber,
    status,
    date,
    showAll,
    withUnreadMessages,
    queuesIds,
    isNotAssignedUser,
    includeNotQueueDefined,
    whatsappId,
    orderBy
  } = req.query as IndexQuery;

  const userId = req.user.id;

  const {
    ticketsOpen,
    ticketsPending,
    ticketsClosed,
    ticketsGroup,
    countOpen,
    countPending,
    countClosed,
    countGroups,
    hasMoreOpen,
    hasMorePending,
    hasMoreClosed,
    hasMoreGroup
  } = await ListTicketsService({
    searchParam,
    pageNumber,
    status,
    date,
    showAll,
    userId,
    withUnreadMessages,
    queuesIds,
    isNotAssignedUser,
    includeNotQueueDefined,
    whatsappId,
    orderBy,
    tenantId,
    profile
  });

  return res.status(200).json({
    ticketsOpen,
    ticketsPending,
    ticketsClosed,
    ticketsGroup,
    countOpen,
    countPending,
    countClosed,
    countGroups,
    hasMoreOpen,
    hasMorePending,
    hasMoreClosed,
    hasMoreGroup
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const { contactId, status, userId, channel, channelId, origin }: TicketData =
    req.body;

  const ticket = await CreateTicketService({
    contactId,
    status,
    userId,
    tenantId,
    channel,
    channelId,
    origin
  });

  // se ticket criado pelo próprio usuário, não emitir socket.
  if (!userId) {
    const io = getIO();
    io.to(`${tenantId}:${ticket.status}`).emit(`${tenantId}:ticket`, {
      action: "create",
      ticket
    });
  }

  return res.status(200).json(ticket);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { tenantId } = req.user;
  const userId = req.user.id;
  const userWithName = req.user as typeof req.user & { name?: string };
  const userName = userWithName?.name || null;
  const userIdNumber = Number(userId);
  const {
    accessSource,
    accessTab,
    ticketStatusAtClick,
    queueIdAtClick,
    assignedUserId,
    assignedUserName
  } = req.query;

  const userProfile = req.user.profile;
  const ticket = await ShowTicketService({ 
    id: ticketId, 
    tenantId, 
    userId: userIdNumber,
    userProfile 
  });
  // const messages = await Message.findAll({
  //   where: {
  //     fromMe: true,
  //     ticketId: ticket.id,
  //     ack: 0,
  //     messageId: { [Op.not]: null }
  //   },
  //   logging: console.log
  // });
  // if (messages) {
  //   await Promise.all(
  //     messages.map(async message => {
  //       console.info(message);
  //       const msg = await GetWbotMessage(ticket, message.messageId);
  //       console.log(msg);
  //     })
  //   );
  // }
  const where = {
    contactId: ticket.contactId,
    scheduleDate: { [Op.not]: null },
    isDeleted: false,
    status: {
      [Op.notIn]: ["canceled", "failed", "deleted"]
    }
  };
  const scheduledMessages = await Message.findAll({
    where
    // logging: console.log
  });

  ticket.setDataValue("scheduledMessages", scheduledMessages);

  const endConversation = await EndConversation.findOne({
    where: {
      id: ticket.endConversationId
    }
  });

  if (endConversation) {
    ticket.setDataValue("endConversation", endConversation);
  }

  const mensagemTransferencia = await MensagemTransferencia.findAll({
    where: {
      ticketId: ticket.id
    }
  });

  ticket.setDataValue("mensagemTransferencia", mensagemTransferencia);

  const statusLabels: Record<string, string> = {
    pending: "Em fila",
    open: "Atendimento",
    closed: "Encerrado",
    pending_evaluation: "Aguardando avaliação"
  };

  const accessSourceLabels: Record<string, string> = {
    aba_atendimento: "aba Atendimento",
    aba_em_fila: "aba Em Fila",
    aba_encerrados: "aba Encerrados",
    aba_grupos: "aba Grupos",
    notification_click: "notificação",
    notification_click_layout: "notificação",
    menu_abrir_ticket: "menu lateral",
    modal_novo_ticket: "modal Novo Ticket",
    contatos_lista: "lista de contatos",
    contatos_novo_ticket: "novo ticket em contatos",
    mixin_status_update: "ação automática (mudar status)",
    modo_espiar: "modo espiar",
    rota_open: "URL (aba Atendimento)",
    rota_pending: "URL (aba Em Fila)",
    rota_closed: "URL (aba Encerrados)",
    rota_group: "URL (aba Grupos)",
    rota_ticket: "URL direta",
    notification_click_layout_sound: "notificação",
    notification_click_main: "notificação",
    notification_click_index: "notificação",
    notification_click_modal: "notificação",
    notification_click_socket: "notificação",
    notification: "notificação",
    notification_click_item: "notificação",
    unknown: "origem desconhecida"
  };

  const normalizedAccessSource =
    (typeof accessSource === "string" && accessSource) ||
    (typeof accessTab === "string" && accessTab) ||
    "unknown";

  const accessSourceLabel =
    accessSourceLabels[normalizedAccessSource] || normalizedAccessSource;

  const ticketStatusLabel =
    (typeof ticketStatusAtClick === "string" &&
      statusLabels[ticketStatusAtClick]) ||
    statusLabels[ticket.status] ||
    ticket.status;

  const hasAssignedUser = !!ticket.user;
  const assignedUserFromTicketId = ticket.user?.id;
  const assignedUserFromTicketName = ticket.user?.name;
  let assignedUserIdFromQuery: number | undefined;
  if (typeof assignedUserId === "string") {
    assignedUserIdFromQuery = Number(assignedUserId);
  } else if (typeof assignedUserId === "number") {
    assignedUserIdFromQuery = assignedUserId;
  }
  const assignedUserNameFromQuery =
    typeof assignedUserName === "string" ? assignedUserName : undefined;

  const alreadyAssignedToAnotherUser =
    hasAssignedUser && assignedUserFromTicketId !== userIdNumber;

  const descriptionParts: string[] = [
    `Acessou o ticket via ${accessSourceLabel}`
  ];

  if (typeof ticketStatusAtClick === "string" && ticketStatusAtClick.length) {
    descriptionParts.push(`Ticket estava listado como ${ticketStatusLabel}`);
  }

  if (alreadyAssignedToAnotherUser && assignedUserFromTicketName) {
    descriptionParts.push(
      `Ticket já estava atribuído para ${assignedUserFromTicketName}`
    );
  } else if (
    assignedUserIdFromQuery &&
    assignedUserIdFromQuery !== userIdNumber &&
    !hasAssignedUser &&
    assignedUserNameFromQuery
  ) {
    descriptionParts.push(
      `Ticket estava atribuído anteriormente para ${assignedUserNameFromQuery}`
    );
  } else if (hasAssignedUser && assignedUserFromTicketName) {
    descriptionParts.push(
      `Ticket estava atribuído para ${assignedUserFromTicketName}`
    );
  }

  const description = `${descriptionParts.join(". ")}.`;

  await CreateLogTicketService({
    userId,
    ticketId,
    type: "access",
    description,
    metadata: {
      accessSource: normalizedAccessSource,
      accessSourceLabel,
      accessTab: accessTab || null,
      ticketStatusAtClick:
        (typeof ticketStatusAtClick === "string" && ticketStatusAtClick) ||
        ticket.status,
      currentTicketStatus: ticket.status,
      queueIdAtClick:
        (typeof queueIdAtClick === "string" && Number(queueIdAtClick)) ||
        ticket.queueId ||
        null,
      queueNameAtClick: ticket.queue?.queue || null,
      queueIdCurrent: ticket.queueId || null,
      queueNameCurrent: ticket.queue?.queue || null,
      hasAssignedUser,
      assignedUserId: assignedUserFromTicketId || null,
      assignedUserName: assignedUserFromTicketName || null,
      assignedUserDifferentFromVisitor: alreadyAssignedToAnotherUser,
      assignedUserIdFromQuery: assignedUserIdFromQuery || null,
      assignedUserNameFromQuery: assignedUserNameFromQuery || null,
      visitorUserId: userId,
      visitorUserName: userName || null
    }
  });

  const isContactsAccess = ["contatos_lista", "contatos_novo_ticket"].includes(
    normalizedAccessSource
  );
  const isSupportAccess = ["support_button", "support_internal"].includes(
    normalizedAccessSource
  );

  if (isContactsAccess) {
    await CreateLogTicketService({
      userId,
      ticketId,
      type: "contactsOpened",
      description: `Acessou o ticket pela tela de contatos (${accessSourceLabel})`,
      metadata: {
        accessSource: normalizedAccessSource,
        accessTab: accessTab || null,
        queueId: ticket.queueId || null,
        queueName: ticket.queue?.queue || null
      }
    });
  }

  if (isSupportAccess) {
    await CreateLogTicketService({
      userId,
      ticketId,
      type: "supportOpened",
      description: `Ticket de suporte aberto pelo painel (${accessSourceLabel})`,
      metadata: {
        accessSource: normalizedAccessSource,
        accessTab: accessTab || null,
        queueId: ticket.queueId || null,
        queueName: ticket.queue?.queue || null
      }
    });
  }

  return res.status(200).json(ticket);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { tenantId } = req.user;
  const userIdRequest = req.user.id;
  const {
    isTransference,
    endConversationId,
    endConversationObservation,
    mensagemTransferencia,
    sendEvaluation
  } = req.body;

  const ticketData: TicketData = { ...req.body, tenantId };

  const { ticket } = await UpdateTicketService({
    ticketData,
    ticketId,
    isTransference,
    userIdRequest,
    endConversationId,
    endConversationObservation,
    mensagemTransferencia,
    sendEvaluation
  });

  if (ticket.status === "closed") {
    await SendFarewellMessage({
      ticket,
      tenantId,
      userId: userIdRequest
    });
  }

  return res.status(200).json(ticket);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { tenantId } = req.user;
  const userId = req.user.id;

  const ticket = await DeleteTicketService({ id: ticketId, tenantId, userId });

  const io = getIO();
  io.to(`${tenantId}:${ticket.status}`)
    .to(`${tenantId}:${ticketId}`)
    .to(`${tenantId}:notification`)
    .emit(`${tenantId}:ticket`, {
      action: "delete",
      ticketId: +ticketId
    });

  return res.status(200).json({ message: "ticket deleted" });
};

export const showLogsTicket = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;

  const logsTicket = await ShowLogTicketService({ ticketId });

  return res.status(200).json(logsTicket);
};

// Relatorio ticket

export const report = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tenantId } = req.user;
  const {
    dateStart,
    dateEnd,
    status,
    userIds,
    queueIds,
    tags,
    whatsappId,
    closeReasonIds,
    page,
    pageSize
  } = req.query as ReportQuery;

  // Validação dos parâmetros de entrada
  const schema = Yup.object().shape({
    dateStart: Yup.string()
      .matches(
        /^\d{4}-\d{2}-\d{2}$/,
        "Data inicial deve estar no formato YYYY-MM-DD"
      )
      .required("Data inicial é obrigatória"),
    dateEnd: Yup.string()
      .matches(
        /^\d{4}-\d{2}-\d{2}$/,
        "Data final deve estar no formato YYYY-MM-DD"
      )
      .required("Data final é obrigatória"),
    whatsappId: Yup.string()
      .matches(/^\d+$/, "ID do WhatsApp deve ser um número")
      .optional(),
    userIds: Yup.array()
      .of(Yup.string().matches(/^\d+$/, "ID do usuário deve ser um número"))
      .optional(),
    queueIds: Yup.array()
      .of(Yup.string().matches(/^\d+$/, "ID da fila deve ser um número"))
      .optional(),
    tags: Yup.array()
      .of(Yup.string().matches(/^\d+$/, "ID da tag deve ser um número"))
      .optional(),
    status: Yup.string()
      .oneOf(
        ["open", "pending", "closed", "todos"],
        "Status deve ser: open, pending, closed ou todos"
      )
      .optional(),
    closeReasonIds: Yup.array()
      .of(
        Yup.string().matches(
          /^\d+$/,
          "ID do motivo de encerramento deve ser um número"
        )
      )
      .optional(),
    page: Yup.string().optional(),
    pageSize: Yup.string().optional()
  });

  try {
    await schema.validate(req.query, { abortEarly: false });
  } catch (error) {
    throw new AppError(error.message);
  }

  // Validação manual dos parâmetros de paginação
  if (page && !/^\d+$/.test(page)) {
    throw new AppError("Página deve ser um número");
  }
  if (pageSize && !/^\d+$/.test(pageSize)) {
    throw new AppError("Tamanho da página deve ser um número");
  }

  // Validação adicional de datas
  if (dateStart && dateEnd) {
    const startDate = new Date(dateStart);
    const endDate = new Date(dateEnd);

    if (startDate > endDate) {
      throw new AppError("Data inicial não pode ser maior que a data final");
    }

    // Verificar se o período não é muito longo (máximo 1 ano)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 365) {
      throw new AppError("O período de consulta não pode ser maior que 1 ano");
    }
  }

  const { tickets, pagination } = await ListTicketsReportService({
    tenantId,
    dateStart,
    dateEnd,
    status,
    userIds: userIds ? userIds.map(id => id) : undefined,
    queueIds: queueIds ? queueIds.map(id => id) : undefined,
    tags: tags ? tags.map(id => id) : undefined,
    whatsappId,
    closeReasonIds: closeReasonIds ? closeReasonIds.map(id => id) : undefined,
    page: page ? parseInt(page, 10) : undefined,
    pageSize: pageSize ? parseInt(pageSize, 10) : undefined
  });

  return res.status(200).json({ tickets, pagination });
};

export const activateConfidential = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { password } = req.body;
  const { tenantId } = req.user;
  const userId = req.user.id;

  if (!password) {
    throw new AppError("ERR_PASSWORD_REQUIRED", 400);
  }

  const ticket = await ActivateConfidentialService({
    ticketId: Number(ticketId),
    userId: Number(userId),
    password,
    tenantId: Number(tenantId)
  });

  return res.status(200).json(ticket);
};

export const deactivateConfidential = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { password } = req.body;
  const { tenantId } = req.user;
  const userId = req.user.id;

  if (!password) {
    throw new AppError("ERR_PASSWORD_REQUIRED", 400);
  }

  const ticket = await DeactivateConfidentialService({
    ticketId: Number(ticketId),
    userId: Number(userId),
    password,
    tenantId: Number(tenantId)
  });

  return res.status(200).json(ticket);
};

export const showConfidential = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { password } = req.body;
  const { tenantId } = req.user;
  const userId = req.user.id;

  if (!password) {
    throw new AppError("ERR_PASSWORD_REQUIRED", 400);
  }

  const result = await ShowConfidentialService({
    ticketId: Number(ticketId),
    userId: Number(userId),
    password,
    tenantId: Number(tenantId)
  });

  return res.status(200).json(result);
};
