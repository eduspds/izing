import type { BaileysSession } from "../../types/baileysAdapter";
import type { IContactAdapter } from "../../types/baileysAdapter";
import { logger } from "../../utils/logger";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import Setting from "../../models/Setting";
import VerifyContact from "./helpers/VerifyContact";
import CreateMessageSystemService from "../MessageServices/CreateMessageSystemService";
import { jidToNumber } from "../../types/baileysAdapter";

/** Payload do evento 'call' no Baileys (pode ser array de chamadas) */
type BaileysCallPayload = Array<{ id: string; from?: string; status?: string }> | { id: string; from?: string; status?: string };

const messageDefault =
  "As chamadas de voz e vídeo estão desabilitadas para esse WhatsApp, favor enviar uma mensagem de texto.";

const VerifyCall = async (callPayload: BaileysCallPayload, wbot: BaileysSession): Promise<void> => {
  const calls = Array.isArray(callPayload) ? callPayload : [callPayload];
  for (const call of calls) {
    try {
      const query = `
        select s."key", s.value, w."tenantId" from "Whatsapps" w
        inner join "Tenants" t on w."tenantId" = t.id
        inner join "Settings" s on t.id = s."tenantId"
        where w.id = '${wbot.id}'
        and s."key" in ('rejectCalls', 'callRejectMessage')
      `;
      const settingsResult = await Setting.sequelize?.query(query);
      let settings = settingsResult?.[0] as Array<{ key: string; value: string; tenantId: number }> | undefined;
      if (Array.isArray(settingsResult) && settingsResult.length) {
        settings = settingsResult[0] as any;
      }

      const rejectCalls =
        settings?.find((s: any) => s.key === "rejectCalls")?.value === "enabled" || false;
      const callRejectMessage =
        settings?.find((s: any) => s.key === "callRejectMessage")?.value || messageDefault;
      const tenantId = settings?.find((s: any) => s.key === "rejectCalls")?.tenantId as number | undefined;

      if (!rejectCalls || tenantId == null) continue;

      const fromJid = call.from;
      if (!fromJid) continue;

      try {
        (wbot.sock as any).rejectCall?.(call.id)?.catch(() => {});
      } catch (e) {
        logger.warn("VerifyCall: rejectCall não disponível ou falhou", e);
      }

      const contactAdapter: IContactAdapter = {
        id: { user: jidToNumber(fromJid), _serialized: fromJid },
        name: jidToNumber(fromJid),
        pushname: jidToNumber(fromJid),
        shortName: jidToNumber(fromJid),
        isUser: true,
        isWAContact: true,
        isGroup: false,
        getProfilePicUrl: async () => wbot.sock.profilePictureUrl(fromJid).catch(() => undefined)
      };

      const contact = await VerifyContact(contactAdapter, tenantId);
      const ticket = await FindOrCreateTicketService({
        contact,
        whatsappId: wbot.id,
        unreadMessages: 1,
        tenantId: tenantId as number | string,
        channel: "whatsapp"
      });

      await CreateMessageSystemService({
        msg: {
          body: callRejectMessage,
          fromMe: true,
          read: true,
          sendType: "bot"
        },
        tenantId: ticket.tenantId,
        ticket,
        sendType: "call",
        status: "pending"
      });
    } catch (err) {
      logger.error("VerifyCall:", err);
    }
  }
};

export default VerifyCall;
