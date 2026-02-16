import { TicketKanbanCreateData } from "../../@types/ticketkanban";
import AppError from "../../errors/AppError";
import TicketKanban from "../../models/TicketKanban";
import TicketKanbanUser from "../../models/TicketKanbanUser";

interface Request {
    ticketKanbanData: TicketKanbanCreateData;
}

const CreateTicketKanbanService = async ({
    ticketKanbanData,
}: Request): Promise<TicketKanban> => {
    const { userId, ...ticketKanbanDataWithoutUserId } = ticketKanbanData;
    const ticketKanban = await TicketKanban.create(ticketKanbanDataWithoutUserId);

    if (userId.length > 0) {
        await TicketKanbanUser.bulkCreate(userId.map(uid => ({
            ticketKanbanId: ticketKanban.id,
            userId: uid
        })));
    }
    return ticketKanban;
};

export default CreateTicketKanbanService;