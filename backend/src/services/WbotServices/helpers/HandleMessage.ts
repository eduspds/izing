import type { IBaileysMessageAdapter, IContactAdapter } from "../../../types/baileysAdapter";
import type { BaileysSession } from "../../../types/baileysAdapter";
import Contact from "../../../models/Contact";
import { logger } from "../../../utils/logger";
import FindOrCreateTicketService from "../../TicketServices/FindOrCreateTicketService";
import ShowWhatsAppService from "../../WhatsappService/ShowWhatsAppService";
import IsValidMsg from "./IsValidMsg";
import VerifyContact from "./VerifyContact";
import VerifyMediaMessage from "./VerifyMediaMessage";
import VerifyMessage from "./VerifyMessage";
import verifyBusinessHours from "./VerifyBusinessHours";
import VerifyStepsChatFlowTicket from "../../ChatFlowServices/VerifyStepsChatFlowTicket";
import Queue from "../../../libs/Queue";
import Setting from "../../../models/Setting";

const getMessageId = (msgId: { id: string; _serialized?: string }): string => {
  return msgId._serialized ?? msgId.id ?? String(msgId);
};

const HandleMessage = async (
  msg: IBaileysMessageAdapter,
  wbot: BaileysSession
): Promise<void> => {
  return new Promise<void>(resolve => {
    (async () => {
      if (!IsValidMsg(msg)) return;

      const whatsapp = await ShowWhatsAppService({ id: wbot.id });
      const { tenantId } = whatsapp;
      const chat = await msg.getChat();

      const remoteNumberRaw = (msg.fromMe ? msg.to : msg.from) ?? "";
      const remoteNumber = remoteNumberRaw.replace(/@[s]\.whatsapp\.net$/i, "").replace(/@[cg]\.us$/i, "").replace(/@lid$/i, "") ?? "";
      const sessionNumber = (whatsapp as any).number ?? "";
      if (sessionNumber && remoteNumber) {
        const norm = (n: string) => (n || "").replace(/\D/g, "");
        if (norm(sessionNumber) === norm(remoteNumber)) {
          logger.info(`[HandleMessage] Ignorando mensagem do próprio número conectado (evita ticket para si): ${remoteNumber}`);
          return resolve();
        }
      }

      const Settingdb = await Setting.findOne({
        where: { key: "ignoreGroupMsg", tenantId }
      });
      if (
        Settingdb?.value === "enabled" &&
        (chat.isGroup || msg.from === "status@broadcast")
      ) {
        return;
      }

      try {
        let msgContact: IContactAdapter;
        let groupContact: Contact | undefined;

        try {
          if (msg.fromMe) {
            if (!msg.hasMedia && msg.type !== "chat" && msg.type !== "vcard")
              return;
            msgContact = await msg.getContact();
          } else {
            msgContact = await msg.getContact();
          }
        } catch (contactError: unknown) {
          const errorMessage =
            contactError instanceof Error
              ? contactError.message
              : String(contactError);
          const messageId = getMessageId(msg.id);
          logger.warn(
            `HandleMessage: Erro ao obter contato, usando fallback | messageId=${messageId} error=${errorMessage}`
          );
          const contactNumber = msg.fromMe
            ? (msg.to ?? "").replace(/@[s]\.whatsapp\.net$/, "").replace(/@[cg]\.us$/, "")
            : msg.from.replace(/@[s]\.whatsapp\.net$/, "").replace(/@[cg]\.us$/, "");
          msgContact = {
            id: { user: contactNumber, _serialized: msg.fromMe ? (msg.to ?? "") : msg.from },
            name: chat.name || contactNumber,
            pushname: chat.name || contactNumber,
            shortName: chat.name || contactNumber,
            isUser: true,
            isWAContact: true,
            isGroup: chat.isGroup || false,
            getProfilePicUrl: async () => undefined
          };
        }

        try {
          if (chat.isGroup) {
            const jid = msg.fromMe ? msg.to! : msg.from;
            const onWa = await wbot.sock.onWhatsApp(jid).catch(() => []);
            const contact = Array.isArray(onWa) ? onWa[0] : undefined;
            const groupContactAdapter: IContactAdapter = contact
              ? {
                  id: { user: (jid || "").split("@")[0], _serialized: jid },
                  name: (contact as any).name ?? jid,
                  pushname: (contact as any).name ?? jid,
                  shortName: (contact as any).name ?? jid,
                  isUser: true,
                  isWAContact: true,
                  isGroup: true,
                  getProfilePicUrl: async () =>
                    wbot.sock.profilePictureUrl(jid).catch(() => undefined)
                }
              : (await msg.getContact()) as IContactAdapter;
            groupContact = await VerifyContact(groupContactAdapter, tenantId);
          }
        } catch (groupError: unknown) {
          const errorMessage =
            groupError instanceof Error
              ? groupError.message
              : String(groupError);
          logger.warn(
            `HandleMessage: Erro ao obter contato do grupo | messageId=${getMessageId(msg.id)} error=${errorMessage}`
          );
        }

        const unreadMessages = msg.fromMe ? 0 : chat.unreadCount;
        const contact = await VerifyContact(msgContact, tenantId);
        if ((contact as any).isBlocked) {
          logger.info(`[HandleMessage] Contato bloqueado - ignorando mensagem: ${(contact as any).number}`);
          resolve();
          return;
        }
        const ticket = await FindOrCreateTicketService({
          contact,
          whatsappId: wbot.id,
          unreadMessages,
          tenantId,
          groupContact,
          msg,
          channel: "whatsapp"
        });

        if (!ticket) {
          resolve();
          return;
        }
        if (ticket.isCampaignMessage || ticket.isFarewellMessage) {
          resolve();
          return;
        }
        if (msg.fromMe && ticket?.status === "closed") {
          resolve();
          return;
        }

        if (msg.hasMedia) {
          await VerifyMediaMessage(msg, ticket, contact);
        } else {
          await VerifyMessage(msg, ticket, contact);
        }

        const isBusinessHours = await verifyBusinessHours(msg, ticket);
        if (isBusinessHours) await VerifyStepsChatFlowTicket(msg, ticket);

        const apiConfig = (ticket.apiConfig || {}) as Record<string, any>;
        if (
          !msg.fromMe &&
          !ticket.isGroup &&
          !ticket.answered &&
          apiConfig?.externalKey &&
          apiConfig?.urlMessageStatus
        ) {
          Queue.add("WebHooksAPI", {
            url: apiConfig.urlMessageStatus,
            type: "hookMessage",
            payload: {
              timestamp: Date.now(),
              msg,
              messageId: msg.id.id,
              ticketId: ticket.id,
              externalKey: apiConfig?.externalKey,
              authToken: apiConfig?.authToken,
              type: "hookMessage"
            }
          });
        }

        resolve();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        const messageId = getMessageId(msg.id);
        logger.error(
          `HandleMessage: Erro ao processar mensagem | messageId=${messageId} error=${errorMessage}`,
          { whatsappId: wbot.id, error: errorStack }
        );
      }
    })();
  });
};

export default HandleMessage;
