import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { getWbot, removeWbot } from "../libs/wbot";
import Whatsapp from "../models/Whatsapp";
import { logger } from "../utils/logger";
import AppError from "../errors/AppError";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";

const reconnect = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { tenantId } = req.user;

  try {
    const channel = await ShowWhatsAppService({ id: whatsappId, tenantId });

    if (channel.type !== "whatsapp") {
      throw new AppError("ERR_INVALID_CHANNEL_TYPE", 400);
    }

    const io = getIO();

    try {
      const existingWbot = getWbot(channel.id);
      if (existingWbot.connectionState === "open") {
        await channel.update({ status: "CONNECTED" });
        io.emit(`${tenantId}:whatsappSession`, { action: "update", session: channel });
        logger.info(`Session ${channel.name} is already connected`);
        return res.status(200).json({ message: "Session is already connected", status: "CONNECTED" });
      }
      existingWbot.sock.end(undefined);
      removeWbot(channel.id);
    } catch {
      logger.info(`Session ${channel.name} not found or corrupted, will recreate`);
    }

    await channel.update({ status: "OPENING" });
    io.emit(`${tenantId}:whatsappSession`, { action: "update", session: channel });

    const { StartWhatsAppSession } = await import("../services/WbotServices/StartWhatsAppSession");
    await StartWhatsAppSession(channel);

    logger.info(`Session ${channel.name} reconnection initiated`);
    return res.status(200).json({ message: "Reconnection initiated", status: "OPENING" });
  } catch (error) {
    logger.error(`WhatsApp reconnect error: ${error}`);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default { reconnect };
