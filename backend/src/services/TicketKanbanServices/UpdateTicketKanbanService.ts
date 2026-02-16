import TicketKanban from "../../models/TicketKanban";
import { TicketKanbanUpdateData } from "../../@types/ticketkanban";
import AppError from "../../errors/AppError";
import TicketKanbanUser from "../../models/TicketKanbanUser";


interface Request {
    ticketKanbanData: TicketKanbanUpdateData;
    ticketKanbanId: number;
}

const UpdateTicketKanbanService = async ({
    ticketKanbanData,
    ticketKanbanId,
}: Request): Promise<TicketKanban> => {

    const { userId, ...ticketKanbanDataWithoutUserId } = ticketKanbanData;
    const ticketKanban = await TicketKanban.findOne({
        where: { id: ticketKanbanId },
        attributes: ["id", "title", "description", "priority", "status", "startDate", "endDate", "mediaUrl", "mediaType", "ticketId"]
    });

    if (!ticketKanban) {
        throw new AppError("ERR_NO_TICKET_KANBAN_FOUND", 404);
    }

    await ticketKanban.update(ticketKanbanDataWithoutUserId);

    if (userId && userId.length > 0) {
        await TicketKanbanUser.destroy({ where: { ticketKanbanId: ticketKanban.id } });
        await TicketKanbanUser.bulkCreate(userId.map(uid => ({
            ticketKanbanId: ticketKanban.id,
            userId: uid
        })));
    }
    return ticketKanban;
};

export default UpdateTicketKanbanService;