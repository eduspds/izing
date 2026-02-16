// services/WbotServices/helpers/HandleMsgAck.ts
import Message from "../../../models/Message";
import Ticket from "../../../models/Ticket";
import { logger } from "../../../utils/logger";
import CampaignContacts from "../../../models/CampaignContacts";
import ApiMessage from "../../../models/ApiMessage";
import socketEmit from "../../../helpers/socketEmit";
import Queue from "../../../libs/Queue";
import { getIO } from "../../../libs/socket";

/** ACK: 0=PENDENTE, 1=ENVIADO, 2=ENTREGUE, 3=LIDO, 4=REPRODUZIDO, -1=ERRO */
const HandleMsgAck = async (messageId: string, ack: number): Promise<void> => {
  await new Promise(r => setTimeout(r, 500));

  try {
    const messageToUpdate = await Message.findOne({
      where: { messageId },
      include: [
        "contact",
        {
          model: Ticket,
          as: "ticket",
          attributes: ["id", "tenantId", "apiConfig"]
        },
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });

    if (messageToUpdate) {
      await messageToUpdate.update({ ack });
      const { ticket } = messageToUpdate;

      const io = getIO();
      io.emit(`${ticket.tenantId}:appMessage`, {
        action: "update",
        message: {
          id: messageToUpdate.id,
          ack,
          updatedAt: new Date()
        },
        ticketId: ticket.id
      });

      logger.info(
        `[HANDLE_ACK] ACK atualizado: ${messageId} -> ${ack} (${getAckDescription(ack)})`
      );

      socketEmit({
        tenantId: ticket.tenantId,
        type: "chat:ack",
        payload: messageToUpdate
      });

      const apiConfig: any = ticket.apiConfig || {};
      if (apiConfig?.externalKey && apiConfig?.urlMessageStatus) {
        Queue.add("WebHooksAPI", {
          url: apiConfig.urlMessageStatus,
          type: "hookMessageStatus",
          payload: {
            ack,
            messageId,
            ticketId: ticket.id,
            externalKey: apiConfig?.externalKey,
            authToken: apiConfig?.authToken,
            type: "hookMessageStatus"
          }
        });
      }
    }

    const messageAPI = await ApiMessage.findOne({
      where: { messageId }
    });
    if (messageAPI) await messageAPI.update({ ack });

    const messageCampaign = await CampaignContacts.findOne({
      where: { messageId }
    });
    if (messageCampaign) await messageCampaign.update({ ack });
  } catch (err) {
    logger.error("[HANDLE_ACK] Erro:", err);
  }
};

function getAckDescription(ack: number): string {
  const descriptions: Record<number | string, string> = {
    0: "PENDENTE",
    1: "ENVIADO",
    2: "ENTREGUE",
    3: "LIDO",
    4: "REPRODUZIDO",
    "-1": "ERRO"
  };
  return descriptions[ack] || "DESCONHECIDO";
}

export default HandleMsgAck;
