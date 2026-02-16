import { getMessengerBot } from "../libs/messengerBot";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import { logger } from "../utils/logger";
import GetTicketWbot from "./GetTicketWbot";
import { toBaileysJidFromLegacy } from "../types/baileysAdapter";
import socketEmit from "./socketEmit";
import { StartWhatsAppSessionVerify } from "../services/WbotServices/StartWhatsAppSessionVerify";

const SetTicketMessagesAsRead = async (ticket: Ticket): Promise<void> => {
  await Message.update(
    { read: true },
    {
      where: {
        ticketId: ticket.id,
        read: false
      }
    }
  );

  await ticket.update({ unreadMessages: 0 });

  try {
    if (ticket.channel === "whatsapp") {
      const wbot = await GetTicketWbot(ticket);
      const jid = toBaileysJidFromLegacy(`${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`);
      wbot.sendSeen(jid).catch(e => console.error("não foi possível marcar como lido", e));
    }
    if (ticket.channel === "messenger") {
      const messengerBot = getMessengerBot(ticket.whatsappId);
      messengerBot.markSeen(ticket.contact.messengerId);
    }
  } catch (err) {
    logger.warn(
      `Could not mark messages as read. Maybe whatsapp session disconnected? Err: ${err}`
    );
    
    // Verificar se é erro de sessão fechada e tentar reconectar
    if (ticket.channel === "whatsapp" && ticket.whatsappId) {
      const errorString = err.toString().toLowerCase();
      if (errorString.includes("session closed") || 
          errorString.includes("protocol error") ||
          errorString.includes("sendseen")) {
        await StartWhatsAppSessionVerify(ticket.whatsappId, err);
      }
    }
    // throw new Error("ERR_WAPP_NOT_INITIALIZED");
  }

  const ticketReload = await ShowTicketService({
    id: ticket.id,
    tenantId: ticket.tenantId
  });

  socketEmit({
    tenantId: ticket.tenantId,
    type: "ticket:update",
    payload: ticketReload
  });
};

export default SetTicketMessagesAsRead;
