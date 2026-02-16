import { pupa } from "../utils/pupa";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import CreateMessageSystemService from "../services/MessageServices/CreateMessageSystemService";

interface Request {
  ticket: Ticket;
  tenantId: number | string;
  userId?: number | string;
}

const SendFarewellMessage = async ({
  ticket,
  tenantId,
  userId
}: Request): Promise<void> => {
  const whatsapp = await Whatsapp.findOne({
    where: { id: ticket.whatsappId, tenantId }
  });

  if (whatsapp?.farewellMessage) {
    const body = pupa(whatsapp.farewellMessage || "", {
      protocol: ticket.protocol,
      name: ticket.contact.name
    });

    const messageData = {
      msg: { body, fromMe: true, read: true },
      tenantId,
      ticket,
      userId,
      sendType: "bot",
      status: "pending",
      isTransfer: false,
      note: false
    };

    await CreateMessageSystemService(messageData);
    await ticket.update({ isFarewellMessage: true });
  }
};

export default SendFarewellMessage;

