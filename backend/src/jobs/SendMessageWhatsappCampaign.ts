/* eslint-disable @typescript-eslint/no-explicit-any */
import { join } from "path";
import { readFile } from "fs/promises";
import { logger } from "../utils/logger";
import { getWbot } from "../libs/wbot";
import { toBaileysJid } from "../types/baileysAdapter";
import CampaignContacts from "../models/CampaignContacts";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import socketEmit from "../helpers/socketEmit";

export default {
  key: "SendMessageWhatsappCampaign",
  options: {
    delay: 15000,
    attempts: 10,
    removeOnComplete: true,
    backoff: { type: "fixed", delay: 60000 * 5 }
  },
  async handle({ data }: any) {
    try {
      const wbot = getWbot(data.whatsappId);
      const jid = toBaileysJid(data.number, false);
      let result: { key: { id: string }; messageTimestamp?: number } = { key: { id: "" } };

      if (data.mediaUrl) {
        const customPath = join(__dirname, "..", "..", "public");
        const mediaPath = join(customPath, data.mediaName);
        const buffer = await readFile(mediaPath);
        result = await wbot.sock.sendMessage(jid, {
          image: buffer,
          caption: data.message
        }) as any;
      } else {
        result = await wbot.sock.sendMessage(jid, { text: data.message }) as any;
      }

      const messageId = result?.key?.id ?? `campaign-${Date.now()}`;
      const timestamp = result?.messageTimestamp ?? Math.floor(Date.now() / 1000);

      await CampaignContacts.update(
        {
          messageId,
          messageRandom: data.messageRandom,
          body: data.message,
          mediaName: data.mediaName,
          timestamp,
          jobId: data.jobId
        },
        { where: { id: data.campaignContact.id } }
      );

      try {
        const { campaignContact, tenantId } = data;
        let ticket = await Ticket.findOne({
          where: {
            contactId: campaignContact.contactId,
            whatsappId: data.whatsappId,
            tenantId
          },
          order: [["updatedAt", "DESC"]],
          include: [{ model: Contact, as: "contact", include: ["extraInfo", "tags"] }]
        });

        if (!ticket) {
          ticket = await Ticket.create({
            contactId: campaignContact.contactId,
            status: "closed",
            isGroup: false,
            tenantId,
            whatsappId: data.whatsappId,
            lastMessage: data.message,
            lastMessageAt: timestamp * 1000,
            answered: true,
            unreadMessages: 0,
            channel: "whatsapp"
          });
          ticket = await Ticket.findByPk(ticket.id, {
            include: [{ model: Contact, as: "contact", include: ["extraInfo", "tags"] }]
          });
        }

        if (ticket) {
          const messageData = {
            messageId,
            body: data.message,
            contactId: campaignContact.contactId,
            fromMe: true,
            read: true,
            mediaType: data.mediaUrl ? "image" : "chat",
            mediaUrl: data.mediaName || null,
            timestamp,
            ack: 1,
            status: "sended",
            sendType: "campaign",
            ticketId: ticket.id,
            tenantId
          };
          const createdMessage = await Message.create(messageData);
          const fullMessage = await Message.findByPk(createdMessage.id, {
            include: [{ model: Ticket, as: "ticket", include: ["contact"] }, { model: Contact, as: "contact" }]
          });
          if (fullMessage) {
            socketEmit({ tenantId, type: "chat:create", payload: fullMessage });
            logger.info(
              `Mensagem de campanha salva | messageId=${messageId} ticketId=${ticket.id} contactId=${campaignContact.contactId}`
            );
          }
        }
      } catch (saveError) {
        logger.error(`Erro ao salvar mensagem de campanha no banco: ${saveError}`);
      }

      return { key: { id: messageId }, messageTimestamp: timestamp };
    } catch (error) {
      logger.error(`Error enviar message campaign: ${error}`);
      throw new Error(error as any);
    }
  }
};
