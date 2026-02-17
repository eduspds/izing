import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { Op } from "sequelize";

interface Request {
  ticketId: string;
  tenantId: number | string;
  userId?: number;
  userProfile?: string;
  limit?: number;
}

export interface MediaItem {
  id: string;
  mediaUrl: string | null;
  mediaType: string;
  body: string | null;
  createdAt: string;
  fromMe: boolean;
}

interface Response {
  items: MediaItem[];
  hasMore: boolean;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

const ListTicketMediaService = async ({
  ticketId,
  tenantId,
  userId,
  userProfile,
  limit = DEFAULT_LIMIT
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService({
    id: ticketId,
    tenantId,
    userId,
    userProfile
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const safeLimit = Math.min(Math.max(1, Number(limit) || DEFAULT_LIMIT), MAX_LIMIT);

  const messages = await Message.findAll({
    where: {
      ticketId: ticket.id,
      mediaUrl: { [Op.ne]: null } as any
    },
    attributes: ["id", "mediaUrl", "mediaType", "body", "createdAt", "fromMe"],
    order: [["createdAt", "DESC"]],
    limit: safeLimit + 1
  });

  const hasMore = messages.length > safeLimit;
  const items = messages.slice(0, safeLimit).map((m: any) => {
    const json = m.toJSON ? m.toJSON() : m;
    return {
      id: json.id,
      mediaUrl: json.mediaUrl || null,
      mediaType: json.mediaType || "document",
      body: json.body || null,
      createdAt: json.createdAt,
      fromMe: Boolean(json.fromMe)
    };
  });

  return { items, hasMore };
};

export default ListTicketMediaService;
