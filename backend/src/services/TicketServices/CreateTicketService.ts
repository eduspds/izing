import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import socketEmit from "../../helpers/socketEmit";
import Ticket from "../../models/Ticket";
import ShowContactService from "../ContactServices/ShowContactService";
import CreateLogTicketService from "./CreateLogTicketService";
import ShowTicketService from "./ShowTicketService";
import { normalizeForComparison } from "../../utils/phoneNumberSimilarity";

interface Request {
  contactId: number;
  status: string;
  userId: number;
  tenantId: string | number;
  channel: string;
  channelId?: number;
  origin?: string;
}

const CreateTicketService = async ({
  contactId,
  status,
  userId,
  tenantId,
  channel,
  channelId = undefined,
  origin
}: Request): Promise<Ticket> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(tenantId, channelId);

  if (!channel || !["instagram", "telegram", "whatsapp"].includes(channel)) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  const contact = await ShowContactService({ id: contactId, tenantId });
  const { isGroup } = contact;

  if (channel === "whatsapp" && !isGroup && contact.number) {
    const sessionNumber = (defaultWhatsapp as any).number;
    if (sessionNumber) {
      const contactNorm = normalizeForComparison(contact.number);
      const sessionNorm = normalizeForComparison(sessionNumber);
      if (contactNorm === sessionNorm) {
        throw new AppError("Não é possível abrir atendimento para o mesmo número conectado ao WhatsApp.");
      }
    }
  }

  await CheckContactOpenTickets(contactId);

  const { id }: Ticket = await defaultWhatsapp.$create("ticket", {
    contactId,
    status,
    isGroup,
    userId,
    isActiveDemand: true,
    channel,
    tenantId,
    updatedAt: new Date() // Garantir que o ticket criado tenha o updatedAt mais recente
  });

  const ticket = await ShowTicketService({ id, tenantId });

  if (!ticket) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  await CreateLogTicketService({
    userId,
    ticketId: ticket.id,
    type: "create"
  });

  if (origin === "contacts") {
    await CreateLogTicketService({
      userId,
      ticketId: ticket.id,
      type: "contactsCreate",
      description: "Ticket criado pela tela de contatos",
      metadata: {
        origin,
        contactId,
        channel,
        channelId
      }
    });
  } else if (origin === "support") {
    await CreateLogTicketService({
      userId,
      ticketId: ticket.id,
      type: "supportCreate",
      description: "Ticket de suporte criado pelo painel",
      metadata: {
        origin,
        contactId,
        channel,
        channelId
      }
    });
  }

  socketEmit({
    tenantId,
    type: "ticket:update",
    payload: ticket
  });

  return ticket;
};

export default CreateTicketService;
