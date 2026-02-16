/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import { logger } from "../utils/logger";
import { getWbot } from "../libs/wbot";
import { toBaileysJid } from "../types/baileysAdapter";
import type { IContactAdapter } from "../types/baileysAdapter";
import Queue from "../libs/Queue";
import AppError from "../errors/AppError";
import VerifyContact from "../services/WbotServices/helpers/VerifyContact";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import CreateMessageSystemService from "../services/MessageServices/CreateMessageSystemService";

export default {
  key: "SendMessageAPI",
  options: {
    delay: 6000,
    attempts: 50,
    removeOnComplete: true,
    removeOnFail: false,
    backoff: { type: "fixed", delay: 60000 * 3 }
  },
  async handle({ data }: any) {
    try {
      const wbot = getWbot(data.sessionId);
      const jid = toBaileysJid(data.number, false);
      const onWa = await wbot.sock.onWhatsApp(jid);
      const wa = Array.isArray(onWa) ? onWa[0] : undefined;
      if (!wa) {
        const payload = {
          ack: -1,
          body: data.body,
          messageId: "",
          number: data.number,
          externalKey: data.externalKey,
          error: "number invalid in whatsapp",
          type: "hookMessageStatus",
          authToken: data.authToken
        };
        if (data.media?.path) fs.unlinkSync(data.media.path);
        if (data?.apiConfig?.urlMessageStatus) {
          Queue.add("WebHooksAPI", { url: data.apiConfig.urlMessageStatus, type: payload.type, payload });
        }
        return payload;
      }

      const contactAdapter: IContactAdapter = {
        id: { user: data.number, _serialized: jid },
        name: (wa as any).name ?? data.number,
        pushname: (wa as any).name ?? data.number,
        shortName: (wa as any).name ?? data.number,
        isUser: true,
        isWAContact: true,
        isGroup: false,
        getProfilePicUrl: async () => wbot.sock.profilePictureUrl(jid).catch(() => undefined)
      };
      const contact = await VerifyContact(contactAdapter, data.tenantId);

      const msgData = { ...data, fromMe: true };
      logger.info(
        `[SendMessageAPI] Criando/buscando ticket | contactId=${contact.id} fromMe=true`
      );

      const ticket = await FindOrCreateTicketService({
        contact,
        whatsappId: wbot.id,
        unreadMessages: 0,
        tenantId: data.tenantId,
        groupContact: undefined,
        msg: msgData,
        channel: "whatsapp"
      });

      await CreateMessageSystemService({
        msg: data,
        tenantId: data.tenantId,
        ticket,
        sendType: "API",
        status: "pending"
      });

      await ticket.update({
        apiConfig: { ...data.apiConfig, externalKey: data.externalKey }
      });
    } catch (error: any) {
      const payload = {
        ack: -2,
        body: data.body,
        messageId: "",
        number: data.number,
        externalKey: data.externalKey,
        error: "error session",
        type: "hookMessageStatus",
        authToken: data.authToken
      };
      if (data?.apiConfig?.urlMessageStatus) {
        Queue.add("WebHooksAPI", {
          url: data.apiConfig.urlMessageStatus,
          type: payload.type,
          payload
        });
      }
      throw new Error(error?.message ?? error);
    }
  }
};
