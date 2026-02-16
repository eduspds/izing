import type { BaileysSession } from "../types/baileysAdapter";
import { getWbot } from "../libs/wbot";
import GetDefaultWhatsApp from "./GetDefaultWhatsApp";
import Ticket from "../models/Ticket";
import { logger } from "../utils/logger";

const GetTicketWbot = async (ticket: Ticket): Promise<BaileysSession> => {
  if (!ticket.whatsappId) {
    const defaultWhatsapp = await GetDefaultWhatsApp(ticket.tenantId);
    await ticket.$set("whatsapp", defaultWhatsapp);
  }

  const wbot = getWbot(ticket.whatsappId);

  if (wbot.connectionState !== "open") {
    logger.warn(`Session ${ticket.whatsappId} appears to be disconnected`);
    throw new Error("Session disconnected");
  }
  return wbot;
};

export default GetTicketWbot;
