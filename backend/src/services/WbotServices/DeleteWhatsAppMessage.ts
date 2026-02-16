import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { StartWhatsAppSessionVerify } from "./StartWhatsAppSessionVerify";
import { getIO } from "../../libs/socket";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import { toBaileysJid } from "../../types/baileysAdapter";

const DeleteWhatsAppMessage = async (
  id: string,
  messageId: string,
  tenantId: string | number
): Promise<void> => {
  if (!messageId || messageId === "null") {
    await Message.update(
      { isDeleted: true, status: "canceled" },
      { where: { id } }
    );
    const message = await Message.findByPk(id, {
      include: [
        { model: Ticket, as: "ticket", include: ["contact"], where: { tenantId } }
      ]
    });
    if (message) {
      const io = getIO();
      io.to(`tenant:${tenantId}:${message.ticket.id}`).emit(
        `tenant:${tenantId}:appMessage`,
        { action: "update", message, ticket: message.ticket, contact: message.ticket.contact }
      );
    }
    return;
  }

  const message = await Message.findOne({
    where: { messageId },
    include: [
      { model: Ticket, as: "ticket", include: ["contact"], where: { tenantId } }
    ]
  });

  if (!message) throw new AppError("No message found with this ID.");
  const { ticket } = message;

  try {
    const wbot = await GetTicketWbot(ticket);
    const jid = toBaileysJid(ticket.contact.number, ticket.isGroup);
    await wbot.sock.sendMessage(jid, {
      delete: {
        remoteJid: jid,
        id: messageId,
        fromMe: message.fromMe
      }
    } as any);
  } catch (err) {
    await StartWhatsAppSessionVerify(ticket.whatsappId, err);
    throw new AppError("ERR_DELETE_WAPP_MSG");
  }

  await message.update({ isDeleted: true });
  const io = getIO();
  io.to(`tenant:${tenantId}:${message.ticket.id}`).emit(
    `tenant:${tenantId}:appMessage`,
    { action: "update", message, contact: ticket.contact }
  );
};

export default DeleteWhatsAppMessage;
