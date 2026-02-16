import { Op } from "sequelize";
import TicketKanban from "../../models/TicketKanban";
import TicketKanbanUser from "../../models/TicketKanbanUser";
import User from "../../models/User";

const includeUsers = [
    { model: User, as: "users", attributes: ["id", "name", "email"], through: { attributes: [] } }
];

interface Request {
    userId: number;
    isAdmin: boolean;
}

const FindAllTicketKanbanService = async ({
    userId,
    isAdmin
}: Request): Promise<TicketKanban[]> => {
    if (!isAdmin) {
        const ticketKanbanUsers = await TicketKanbanUser.findAll({ where: { userId } });
        const ticketKanbanIds = ticketKanbanUsers.map(usr => usr.ticketKanbanId);
        const ticketKanbans = await TicketKanban.findAll({
            where: { id: { [Op.in]: ticketKanbanIds } },
            include: includeUsers
        });
        return ticketKanbans;
    }
    return await TicketKanban.findAll({ include: includeUsers });
}

export default FindAllTicketKanbanService;