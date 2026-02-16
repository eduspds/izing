// import { Sequelize } from "sequelize-typescript";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import MessagesOffLine from "../../models/MessageOffLine";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";

interface Request {
  ticketId: string;
  tenantId: number | string;
  pageNumber?: string;
  userId?: number;
  userProfile?: string;
}

interface Response {
  messages: Message[];
  messagesOffLine: MessagesOffLine[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId,
  tenantId,
  userId,
  userProfile
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService({ id: ticketId, tenantId, userId, userProfile });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // await setMessagesAsRead(ticket);
  const limit = 30;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: messages } = await Message.findAndCountAll({
    limit,
    include: [
      "contact",
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      },
      {
        model: Ticket,
        as: "ticket",
        where: {
          contactId: ticket.contactId,
          whatsappId: ticket.whatsappId,
          tenantId: ticket.tenantId
        },
        required: true
      }
    ],
    offset,
    // logging: console.log,
    order: [["timestamp", "DESC"], ["createdAt", "DESC"]]
  });

  let messagesOffLine: MessagesOffLine[] = [];
  if (+pageNumber === 1) {
    const { rows } = await MessagesOffLine.findAndCountAll({
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        },
        {
          model: Ticket,
          as: "ticket",
          where: {
            contactId: ticket.contactId,
            whatsappId: ticket.whatsappId,
            tenantId: ticket.tenantId
          },
          required: true
        }
      ],
      order: [["createdAt", "DESC"]]
    });
    messagesOffLine = rows;
  }

  // Filtrar mensagens sigilosas baseado no userId
  let filteredMessages = messages;
  if (userId) {
    filteredMessages = messages.filter((message) => {
      // Se mensagem não é sigilosa, mostrar
      if (!message.isConfidential) {
        return true;
      }
      // Se mensagem é sigilosa, só mostrar para o usuário autorizado
      return message.confidentialUserId === userId;
    });
  } else {
    // Se não tem userId, filtrar todas as mensagens sigilosas
    filteredMessages = messages.filter((message) => !message.isConfidential);
  }

  // Filtrar mensagens offline também
  let filteredMessagesOffLine = messagesOffLine;
  if (userId) {
    filteredMessagesOffLine = messagesOffLine.filter((message) => {
      if (!message.isConfidential) {
        return true;
      }
      return message.confidentialUserId === userId;
    });
  } else {
    filteredMessagesOffLine = messagesOffLine.filter(
      (message) => !message.isConfidential
    );
  }

  const hasMore = count > offset + filteredMessages.length;

  return {
    messages: filteredMessages.reverse(),
    messagesOffLine: filteredMessagesOffLine,
    ticket,
    count: filteredMessages.length,
    hasMore
  };
};

export default ListMessagesService;
