import { differenceInHours, parseJSON } from "date-fns";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import { getTbot } from "../libs/tbot";
import AppError from "../errors/AppError";
import socketEmit from "./socketEmit";

interface EditMessageData {
  id: string;
  messageId: string;
  newBody: string;
  tenantId: string | number;
  scheduleDate?: Date | string | null;
}

const EditMessageSystem = async ({
  id,
  messageId,
  newBody,
  tenantId,
  scheduleDate
}: EditMessageData): Promise<Message> => {
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

  if (!message) {
    throw new AppError("No message found with this ID.");
  }

  // Verificar se a mensagem foi enviada pelo usuário (fromMe)
  if (!message.fromMe) {
    throw new AppError("Cannot edit messages from others.");
  }

  // Verificar limite de tempo para editar (15 minutos conforme WhatsApp)
  const isScheduledPending =
    message.status === "pending" && message.scheduleDate !== null;

  if (message.createdAt && !isScheduledPending) {
    const diffMinutes =
      differenceInHours(new Date(), parseJSON(message.createdAt)) * 60;
    if (diffMinutes > 15) {
      throw new AppError("Cannot edit message after 15 minutes.");
    }
  }

  const { ticket } = message;

  // Verifica se a mensagem já foi enviada
  const messageWasSent = message.status !== "pending" && message.messageId;

  // Só tenta editar no WhatsApp/Telegram se a mensagem já foi enviada
  if (messageWasSent) {
    if (ticket.channel === "whatsapp") {
      const GetTicketWbot = (await import("./GetTicketWbot")).default;
      const { toBaileysJid } = await import("../types/baileysAdapter");
      const wbot = await GetTicketWbot(ticket);
      const jid = toBaileysJid(ticket.contact.number, ticket.isGroup);
      try {
        await (wbot.sock as any).sendMessage(jid, {
          edit: {
            key: { remoteJid: jid, id: messageId, fromMe: message.fromMe },
            text: newBody
          }
        });
      } catch (error) {
        throw new AppError("ERROR_EDIT_WAPP_MSG");
      }
    }

    if (ticket.channel === "telegram") {
      const telegramBot = await getTbot(ticket.whatsappId);
      try {
        await telegramBot.telegram.editMessageText(
          ticket.contact.telegramId,
          +message.messageId,
          undefined,
          newBody
        );
      } catch (error) {
        throw new AppError("ERROR_EDIT_TELEGRAM_MSG");
      }
    }

    // Instagram e Messenger não suportam edição de mensagens
    if (ticket.channel === "instagram" || ticket.channel === "messenger") {
      throw new AppError("Channel does not support message editing.");
    }
  }

  // Atualizar mensagem no banco de dados
  const updateData: Partial<Message> = {
    body: newBody,
    isEdited: true,
    updatedAt: new Date()
  };

  if (scheduleDate && message.status === "pending") {
    updateData.scheduleDate = new Date(scheduleDate);
  }

  await message.update(updateData);

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

  // Emitir evento de edição usando o padrão socketEmit
  socketEmit({
    tenantId,
    type: "chat:edit",
    payload: message
  });

  return message;
};

export default EditMessageSystem;
