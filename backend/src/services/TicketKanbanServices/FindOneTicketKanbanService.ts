import AppError from "../../errors/AppError";
import TicketKanban from "../../models/TicketKanban";
import TicketKanbanUser from "../../models/TicketKanbanUser";
import User from "../../models/User";

interface Request {
    ticketKanbanId: number;
    userId: number;
    isAdmin: boolean;
}

const FindOneTicketKanbanService = async ({
    ticketKanbanId,
    userId,
    isAdmin
}: Request): Promise<TicketKanban> => {

    if (!isAdmin) {
        const canUserAccessTicketKanban = await TicketKanbanUser.findOne(
            { where: { ticketKanbanId, userId } }
        );

        if (!canUserAccessTicketKanban) {
            throw new AppError("ERR_NO_PERMISSION", 403);
        }
    }

    const ticketKanban = await TicketKanban.findOne({
        where: { id: ticketKanbanId },
        attributes: ["id", "title", "description", "priority", "status", "startDate", "endDate", "mediaUrl", "mediaType", "ticketId"],
        include: [
            { model: User, as: "users", attributes: ["id", "name", "email"], through: { attributes: [] } }
        ]
    });

    if (!ticketKanban) {
        throw new AppError("ERR_NO_TICKET_KANBAN_FOUND", 404);
    }

    return ticketKanban;
}

export default FindOneTicketKanbanService;