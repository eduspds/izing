/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { Op } from "sequelize";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import Contact from "../../models/Contact";
import SendMessage from "./SendMessage";
import SendMessageSystemProxy from "../../helpers/SendMessageSystemProxy";
// import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";

const SendMessagesSchenduleWbot = async (): Promise<void> => {
  const currentDate = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: process.env.TIMEZONE || "America/Sao_Paulo"
    })
  );
  const twentyFourHoursAgo = new Date(
    currentDate.getTime() - 24 * 60 * 60 * 1000
  );

  const where = {
    fromMe: true,
    messageId: { [Op.is]: null },
    status: "pending",
    scheduleDate: {
      [Op.lte]: currentDate, // Menor ou igual à data atual
      [Op.gte]: twentyFourHoursAgo
    }
  };
  const messages = await Message.findAll({
    where,
    include: [
      {
        model: Contact,
        as: "contact"
      },
      {
        model: Ticket,
        as: "ticket",
        where: {
          status: ["open", "pending", "closed", "pending_evaluation"] // Victor: Coloquei closed para enviar mensagens schedule em tickets encerrados
        },
        include: ["contact"]
      },
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ],
    order: [["createdAt", "ASC"]]
  });

  for (const message of messages) {
    logger.info(
      `Message Schendule SendMessage: ${message.id} | Tenant: ${message.tenantId} `
    );

    if (message.ticket.channel !== "whatsapp") {
      try {
        const sent = await SendMessageSystemProxy({
          ticket: message.ticket,
          messageData: message.toJSON(),
          media: null,
          userId: message.userId
        });

        message.update({
          messageId: sent.id?.id || sent.messageId,
          status: "sended",
          ack: 2,
          userId: message.userId
        });
      } catch (error) {
        logger.error(
          "SendMessagesSchenduleWbot > SendMessageSystemProxy",
          error
        );
      }
    } else {
      try {
        await SendMessage(message);
      } catch (error: any) {
        const errorMessage = error?.message || "";
        // ✅ Se o erro for de sessão não pronta, não marcar como erro fatal
        // A mensagem será reenviada na próxima execução do job
        if (
          errorMessage.includes("ERR_WAPP_NOT_READY") ||
          errorMessage.includes("ERR_WAPP_NOT_INITIALIZED") ||
          errorMessage.includes("target closed") ||
          errorMessage.includes("protocol error")
        ) {
          logger.warn(
            `SendMessagesSchenduleWbot > SendMessage: Sessão não pronta para mensagem ${message.id}. Será reenviada na próxima tentativa.`
          );
        } else {
          logger.error("SendMessagesSchenduleWbot > SendMessage", error);
        }
      }
    }
  }
};

export default SendMessagesSchenduleWbot;
