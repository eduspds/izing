import { differenceInHours, parseJSON } from "date-fns";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import { getTbot } from "../libs/tbot";
// import { getInstaBot } from "../libs/InstaBot";
import AppError from "../errors/AppError";
import socketEmit from "./socketEmit";

const DeleteMessageSystem = async (
  id: string,
  messageId: string,
  tenantId: string | number
): Promise<void> => {
  const message = await Message.findOne({
    where: { id },
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"],
        where: { tenantId }
      }
    ]
  });

  if (message) {
    const diffHoursDate = differenceInHours(
      new Date(),
      parseJSON(message?.createdAt)
    );
    if (diffHoursDate > 2) {
      throw new AppError("No delete message afeter 2h sended");
    }
  }

  if (!message) {
    throw new AppError("No message found with this ID.");
  }

  const { ticket } = message;

  // Verifica se a mensagem já foi enviada
  // Se status for "pending" ou messageId for null, significa que ainda não foi enviada
  const messageWasSent = message.status !== "pending" && message.messageId;

  // Só tenta apagar no WhatsApp/Telegram/Instagram se a mensagem já foi enviada
  if (messageWasSent) {
    if (ticket.channel === "whatsapp") {
      const GetTicketWbot = (await import("./GetTicketWbot")).default;
      const { toBaileysJid } = await import("../types/baileysAdapter");
      const wbot = await GetTicketWbot(ticket);
      const jid = toBaileysJid(ticket.contact.number, ticket.isGroup);
      try {
        await (wbot.sock as any).sendMessage(jid, {
          delete: { remoteJid: jid, id: messageId, fromMe: message.fromMe }
        });
      } catch (error) {
        throw new AppError("ERROR_NOT_FOUND_MESSAGE");
      }
    }

    if (ticket.channel === "telegram") {
      const telegramBot = await getTbot(ticket.whatsappId);
      await telegramBot.telegram.deleteMessage(
        ticket.contact.telegramId,
        +message.messageId
      );
    }

    if (ticket.channel === "instagram") {
      // const chatId = ticket.contact.instagramPK;
      // const instaBot = await getInstaBot(ticket.whatsappId);
      // const threadEntity = await instaBot.entity.directThread([chatId]);
      // if (!threadEntity.threadId) return;
      // await threadEntity.deleteItem(message.messageId);
      return;
    }

    // não possui suporte para apagar mensagem
    if (ticket.channel === "messenger") {
      return;
    }
  }

  await message.update({ isDeleted: true, status: "canceled" });

  // Recarregar mensagem com todos os relacionamentos
  await message.reload({
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"]
      }
    ]
  });

  // Emitir evento de delete usando o padrão socketEmit
  socketEmit({
    tenantId,
    type: "chat:delete",
    payload: message
  });
};

export default DeleteMessageSystem;
