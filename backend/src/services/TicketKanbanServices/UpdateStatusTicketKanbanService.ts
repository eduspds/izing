import AppError from "../../errors/AppError";
import TicketKanban from "../../models/TicketKanban";
import TicketKanbanUser from "../../models/TicketKanbanUser";


interface Request {
    ticketKanbanId: number;
    userId: number;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    isAdmin: boolean;
}

const UpdateStatusTicketKanbanService = async ({
    ticketKanbanId,
    userId,
    status,
    isAdmin
}: Request): Promise<TicketKanban> => {

    if (!isAdmin) {
        const userCanAccessTicketKanban = await TicketKanbanUser.findOne({ where: { ticketKanbanId, userId } });
        if (!userCanAccessTicketKanban) {
            throw new AppError("ERR_NO_PERMISSION", 403);
        }
    }

    const ticketKanban = await TicketKanban.findOne({ where: { id: ticketKanbanId } });
    if (!ticketKanban) {
        throw new AppError("ERR_NO_TICKET_KANBAN_FOUND", 404);
    }

    await ticketKanban.update({ status });
    return ticketKanban;
}

export default UpdateStatusTicketKanbanService;