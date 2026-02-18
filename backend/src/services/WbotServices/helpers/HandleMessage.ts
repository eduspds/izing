import type { IBaileysMessageAdapter, IContactAdapter } from "../../../types/baileysAdapter";
import type { BaileysSession } from "../../../types/baileysAdapter";
import { sanitizeJidToPhone } from "../../../types/baileysAdapter";
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
import CheckChatBotFlowWelcome from "../../../helpers/CheckChatBotFlowWelcome";
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
      if (!IsValidMsg(msg)) {
        logger.debug(`[HandleMessage] Mensagem ignorada por IsValidMsg (tipo não suportado): ${msg.type}`);
        return resolve();
      }

      logger.info(`[HandleMessage] Iniciando processamento: msgId=${getMessageId(msg.id)} fromMe=${msg.fromMe}`);
      try {
      const whatsapp = await ShowWhatsAppService({ id: wbot.id });
      const { tenantId } = whatsapp;
      logger.info(`[HandleMessage] getChat() iniciando: msgId=${getMessageId(msg.id)}`);
      const GET_CHAT_TIMEOUT_MS = 8000;
      let chat: Awaited<ReturnType<typeof msg.getChat>>;
      try {
        chat = await Promise.race([
          msg.getChat(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("getChat timeout")), GET_CHAT_TIMEOUT_MS)
          )
        ]);
      } catch (chatErr) {
        const isTimeout = chatErr instanceof Error && chatErr.message === "getChat timeout";
        logger.warn(
          `[HandleMessage] getChat falhou (${isTimeout ? "timeout" : (chatErr as Error).message}), usando fallback | msgId=${getMessageId(msg.id)}`
        );
        const jid = msg.fromMe ? msg.to ?? msg.from : msg.from;
        const rawJid = typeof jid === "string" ? jid : "";
        chat = {
          id: rawJid,
          name: rawJid.replace(/@.*$/, "") || "Contato",
          isGroup: rawJid.endsWith("@g.us"),
          unreadCount: 0
        };
      }
      logger.info(`[HandleMessage] getChat() ok: msgId=${getMessageId(msg.id)}`);

      const remoteNumberRaw = (msg.fromMe ? msg.to : msg.from) ?? "";
      const remoteNumber = sanitizeJidToPhone(remoteNumberRaw);
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
        return resolve();
      }
        let msgContact: IContactAdapter;
        let groupContact: Contact | undefined;

        const buildContactFallback = (): IContactAdapter => {
          const rawJid = msg.fromMe ? (msg.to ?? "") : (msg.from ?? "");
          const contactNumber = sanitizeJidToPhone(rawJid);
          return {
            id: { user: contactNumber, _serialized: rawJid },
            name: chat.name || contactNumber,
            pushname: chat.name || contactNumber,
            shortName: chat.name || contactNumber,
            isUser: true,
            isWAContact: true,
            isGroup: chat.isGroup || false,
            getProfilePicUrl: async () => undefined
          };
        };

        try {
          if (msg.fromMe) {
            if (!msg.hasMedia && msg.type !== "chat" && msg.type !== "vcard") {
              return resolve();
            }
          }
          logger.info(`[HandleMessage] getContact() iniciando: msgId=${getMessageId(msg.id)}`);
          const GET_CONTACT_TIMEOUT_MS = 2000;
          msgContact = await Promise.race([
            msg.getContact(),
            new Promise<IContactAdapter>((_, reject) =>
              setTimeout(() => reject(new Error("getContact timeout")), GET_CONTACT_TIMEOUT_MS)
            )
          ]);
          logger.info(`[HandleMessage] getContact() ok: msgId=${getMessageId(msg.id)}`);
        } catch (contactError: unknown) {
          const errorMessage =
            contactError instanceof Error
              ? contactError.message
              : String(contactError);
          const messageId = getMessageId(msg.id);
          logger.warn(
            `HandleMessage: Erro ao obter contato, usando fallback | messageId=${messageId} error=${errorMessage}`
          );
          msgContact = buildContactFallback();
        }

        try {
          if (chat.isGroup) {
            const jid = msg.fromMe ? msg.to! : msg.from;
            const onWa = await wbot.sock.onWhatsApp(jid).catch(() => []);
            const contact = Array.isArray(onWa) ? onWa[0] : undefined;
            const groupContactAdapter: IContactAdapter = contact
              ? {
                  id: { user: sanitizeJidToPhone(jid || ""), _serialized: jid },
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
        logger.info(`[HandleMessage] VerifyContact iniciando: msgId=${getMessageId(msg.id)}`);
        const contact = await VerifyContact(msgContact, tenantId);
        logger.info(`[HandleMessage] VerifyContact ok contactId=${(contact as any).id}: msgId=${getMessageId(msg.id)}`);
        // Só ignora mensagens de contato bloqueado em chat 1:1 (em grupo não aplica, para não quebrar recebimento)
        if (!chat.isGroup && (contact as any).isBlocked === true) {
          logger.info(`[HandleMessage] Contato bloqueado - ignorando mensagem: ${(contact as any).number}`);
          resolve();
          return;
        }
        logger.info(`[HandleMessage] FindOrCreateTicketService iniciando: msgId=${getMessageId(msg.id)}`);
        const ticket = await FindOrCreateTicketService({
          contact,
          whatsappId: wbot.id,
          unreadMessages,
          tenantId,
          groupContact,
          msg,
          channel: "whatsapp"
        });
        logger.info(`[HandleMessage] FindOrCreateTicketService ok ticketId=${(ticket as any)?.id}: msgId=${getMessageId(msg.id)}`);

        if (!ticket) {
          logger.info(
            `[HandleMessage] Retorno antecipado: ticket null (pode ser mensagem do próprio número conectado - teste de outro celular) | msgId=${getMessageId(msg.id)} fromMe=${msg.fromMe}`
          );
          resolve();
          return;
        }
        if ((ticket as any).isCampaignMessage) {
          logger.debug(`[HandleMessage] Retorno antecipado: mensagem de campanha | msgId=${getMessageId(msg.id)}`);
          resolve();
          return;
        }
        if ((ticket as any).isFarewellMessage) {
          logger.debug(`[HandleMessage] Retorno antecipado: mensagem de despedida | msgId=${getMessageId(msg.id)}`);
          resolve();
          return;
        }
        if (msg.fromMe && ticket?.status === "closed") {
          logger.debug(`[HandleMessage] Retorno antecipado: fromMe e ticket fechado | msgId=${getMessageId(msg.id)}`);
          resolve();
          return;
        }

        logger.info(`[HandleMessage] Processando mensagem recebida | msgId=${getMessageId(msg.id)} ticketId=${(ticket as any).id} fromMe=${msg.fromMe} hasMedia=${msg.hasMedia}`);

        if (!msg.fromMe && !(ticket as any).isGroup && !(ticket as any).userId && (ticket as any).status === "pending" && !(ticket as any).chatFlowId) {
          logger.info(`[HandleMessage] Ticket existente sem fluxo – ativando bot e enviando primeiro passo | ticketId=${(ticket as any).id}`);
          await CheckChatBotFlowWelcome(ticket);
          await ticket.reload();
        }

        if (msg.hasMedia) {
          await VerifyMediaMessage(msg, ticket, contact);
        } else {
          await VerifyMessage(msg, ticket, contact);
        }

        const isBusinessHours = await verifyBusinessHours(msg, ticket);
        if (!isBusinessHours) {
          logger.debug("[HandleMessage] Fora do horário comercial – bot do fluxo não executa | ticketId=" + (ticket as any).id);
        } else if ((ticket as any).chatFlowId) {
          logger.info("[HandleMessage] Executando VerifyStepsChatFlowTicket | ticketId=" + (ticket as any).id + " stepChatFlow=" + (ticket as any).stepChatFlow);
        }
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
        resolve();
      }
    })();
  });
};

export default HandleMessage;
