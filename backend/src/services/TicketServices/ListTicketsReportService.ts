import { QueryTypes } from "sequelize";
import { parseISO, startOfDay, endOfDay } from "date-fns";
import Ticket from "../../models/Ticket";

interface Request {
  closeReasonIds?: string[];
  tenantId: string | number;
  dateStart?: string;
  dateEnd?: string;
  whatsappId?: string;
  userIds?: string[];
  queueIds?: string[];
  tags?: string[];
  status?: string;
  page?: number;
  pageSize?: number;
}

interface Response {
  tickets: unknown[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
  };
}

const ListTicketsReportService = async ({
  tenantId,
  dateStart,
  dateEnd,
  whatsappId,
  userIds,
  queueIds,
  tags,
  status,
  closeReasonIds,
  page = 1,
  pageSize = 50
}: Request): Promise<Response> => {
  // Validação de parâmetros de paginação
  const currentPage = Math.max(1, page);
  const limit = Math.min(Math.max(1, pageSize), 500); // Máximo 500 registros por página
  const offset = (currentPage - 1) * limit;

  // Construir condições WHERE de forma otimizada
  let whereConditions = `t."tenantId" = :tenantId`;
  const replacements: Record<string, unknown> = {
    tenantId,
    limit,
    offset
  };

  // Filtro por data
  if (dateStart) {
    whereConditions += ` AND t."createdAt" >= :dateStart`;
    replacements.dateStart = startOfDay(parseISO(dateStart));
  }

  if (dateEnd) {
    whereConditions += ` AND t."createdAt" <= :dateEnd`;
    replacements.dateEnd = endOfDay(parseISO(dateEnd));
  }

  // Filtro por canal WhatsApp
  if (whatsappId) {
    whereConditions += ` AND t."whatsappId" = :whatsappId`;
    replacements.whatsappId = +whatsappId;
  }

  // Filtro por motivo de encerramento
  if (closeReasonIds && closeReasonIds.length > 0) {
    whereConditions += ` AND t."endConversationId" IN (:closeReasonIds)`;
    replacements.closeReasonIds = closeReasonIds.map(id => +id);
  }

  // Filtro por tags - usando JOIN em vez de EXISTS para melhor performance
  if (tags && tags.length > 0) {
    whereConditions += ` AND EXISTS (SELECT 1 FROM "ContactTags" ct WHERE ct."contactId" = t."contactId" AND ct."tagId" IN (:tags))`;
    replacements.tags = tags.map(id => +id);
  }

  // Filtro por status
  if (status && status !== "todos") {
    whereConditions += ` AND t.status = :status`;
    replacements.status = status;
  } else if (status === "todos" || !status) {
    whereConditions += ` AND t.status IN ('open', 'pending', 'closed')`;
  }

  // Filtros condicionais por usuário e fila baseados no status
  if (status === "pending") {
    // Para tickets pendentes, filtrar apenas por fila
    if (queueIds && queueIds.length > 0) {
      whereConditions += ` AND t."queueId" IN (:queueIds)`;
      replacements.queueIds = queueIds.map(id => +id);
    }
  } else {
    // Para outros status, filtrar por usuário e/ou fila
    if (userIds && userIds.length > 0) {
      whereConditions += ` AND t."userId" IN (:userIds)`;
      replacements.userIds = userIds.map(id => +id);
    }
    if (queueIds && queueIds.length > 0) {
      whereConditions += ` AND t."queueId" IN (:queueIds)`;
      replacements.queueIds = queueIds.map(id => +id);
    }
  }

  // Query otimizada usando CTEs para buscar primeiro e último atendente
  const query = `
    WITH FirstAttendants AS (
      SELECT DISTINCT ON (lt."ticketId") 
        lt."ticketId",
        u.name as "firstAttendant"
      FROM "LogTickets" lt
      INNER JOIN "Users" u ON u.id = lt."userId"
      WHERE lt.type = 'open'
      ORDER BY lt."ticketId", lt."createdAt" ASC
    ),
    LastAttendants AS (
      SELECT DISTINCT ON (lt."ticketId")
        lt."ticketId", 
        u.name as "lastAttendant"
      FROM "LogTickets" lt
      INNER JOIN "Users" u ON u.id = lt."userId"
      WHERE lt.type = 'closed'
      ORDER BY lt."ticketId", lt."createdAt" DESC
    ),
    TicketData AS (
      SELECT 
        t.*,
        CASE 
          WHEN t."lastInteractionBot" IS NOT NULL THEN 'Receptivo'
          ELSE 'Ativo'
        END as "initialization",
        fa."firstAttendant",
        la."lastAttendant",
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'number', c.number
        ) as contact,
        jsonb_build_object(
          'id', q.id,
          'name', q.queue
        ) as queue,
        jsonb_build_object(
          'id', w.id,
          'name', w.name
        ) as whatsapp,
        COUNT(*) OVER() as "totalCount"
      FROM "Tickets" t
      LEFT JOIN FirstAttendants fa ON fa."ticketId" = t.id
      LEFT JOIN LastAttendants la ON la."ticketId" = t.id
      LEFT JOIN "Contacts" c ON c.id = t."contactId"
      LEFT JOIN "Queues" q ON q.id = t."queueId"
      LEFT JOIN "Whatsapps" w ON w.id = t."whatsappId"
      WHERE ${whereConditions}
    )
    SELECT * FROM TicketData
    ORDER BY "updatedAt" DESC
    LIMIT :limit OFFSET :offset;
  `;

  const tickets = await Ticket.sequelize?.query(query, {
    replacements,
    type: QueryTypes.SELECT
  });

  // Calcular metadados de paginação
  const totalRecords =
    tickets && tickets.length > 0
      ? Number((tickets[0] as Record<string, unknown>).totalCount) || 0
      : 0;
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    tickets: tickets || [],
    pagination: {
      page: currentPage,
      pageSize: limit,
      totalPages,
      totalRecords
    }
  };
};

export default ListTicketsReportService;
