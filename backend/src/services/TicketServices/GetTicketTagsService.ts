import { QueryTypes } from "sequelize";
import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";

interface Request {
  ticketId: string | number;
  tenantId: string | number;
}

interface Response {
  tags: Array<{
    id: number;
    tag: string;
    color: string;
    isActive: boolean;
  }>;
}

const GetTicketTagsService = async ({
  ticketId,
  tenantId
}: Request): Promise<Response> => {
  // Verificar se o ticket existe e pertence ao tenant
  const ticket = await Ticket.findOne({
    where: { id: ticketId, tenantId },
    attributes: ["id", "contactId"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // Query otimizada para buscar apenas as etiquetas necessárias
  const query = `
    SELECT 
      t.id,
      t.tag,
      t.color,
      t."isActive"
    FROM "ContactTags" ct
    INNER JOIN "Tags" t ON t.id = ct."tagId"
    WHERE ct."contactId" = :contactId
      AND t."isActive" = true
      AND t."tenantId" = :tenantId
    ORDER BY t.tag ASC
    LIMIT 20
  `;

  const tags = await Ticket.sequelize?.query(query, {
    replacements: {
      contactId: ticket.contactId,
      tenantId
    },
    type: QueryTypes.SELECT
  });

  return {
    tags: tags as Array<{
      id: number;
      tag: string;
      color: string;
      isActive: boolean;
    }>
  };
};

export default GetTicketTagsService;
