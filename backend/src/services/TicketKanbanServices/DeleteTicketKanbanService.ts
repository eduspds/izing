import AppError from "../../errors/AppError";
import TicketKanban from "../../models/TicketKanban";

interface Request {
    ticketKanbanId: number;
}

const DeleteTicketKanbanService = async ({
    ticketKanbanId,
}: Request): Promise<TicketKanban> => {
    const ticketKanban = await TicketKanban.findOne({ where: { id: ticketKanbanId } });
    if (!ticketKanban) {
        throw new AppError("ERR_NO_TICKET_KANBAN_FOUND", 404);
    }
    await ticketKanban.destroy();

    return ticketKanban;
}

export default DeleteTicketKanbanService;