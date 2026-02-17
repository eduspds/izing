import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import User from "../../models/User";
import AppError from "../../errors/AppError";

interface Request {
  contactId: string | number;
  tenantId: string | number;
  limit?: number;
}

interface TicketSummary {
  id: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: number | null;
  lastMessage?: string | null;
  user?: { id: number; name: string } | null;
}

const ListTicketsByContactService = async ({
  contactId,
  tenantId,
  limit = 50
}: Request): Promise<{ tickets: TicketSummary[] }> => {
  const contact = await Contact.findOne({
    where: { id: contactId, tenantId }
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  const tickets = await Ticket.findAll({
    where: { contactId: contact.id, tenantId },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name"],
        required: false
      }
    ],
    order: [["updatedAt", "DESC"]],
    limit
  });

  const ticketsSummary: TicketSummary[] = tickets.map((t: any) => ({
    id: t.id,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    lastMessageAt: t.lastMessageAt,
    lastMessage: t.lastMessage,
    user: t.user ? { id: t.user.id, name: t.user.name } : null
  }));

  return { tickets: ticketsSummary };
};

export default ListTicketsByContactService;
