// services/WbotServices/wbotMessageListener.ts
import type { BaileysSession } from "../../types/baileysAdapter";
import { buildBaileysMessageAdapter } from "../../libs/baileysMessageAdapter";
import HandleMessage from "./helpers/HandleMessage";
import HandleMsgAck from "./helpers/HandleMsgAck";
import VerifyCall from "./VerifyCall";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";
import Whatsapp from "../../models/Whatsapp";
import type { proto } from "@whiskeysockets/baileys";

function getAckDescription(ack: number): string {
  const descriptions: { [key: number]: string } = {
    0: "PENDENTE",
    1: "ENVIADO",
    2: "ENTREGUE",
    3: "LIDO",
    4: "REPRODUZIDO",
    [-1]: "ERRO"
  };
  return descriptions[ack] || "DESCONHECIDO";
}

const updateWhatsAppStatus = async (
  whatsappId: number,
  status: string
): Promise<void> => {
  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (whatsapp) {
      await whatsapp.update({ status });
      const io = getIO();
      io.emit(`${whatsapp.tenantId}:whatsappSession`, {
        action: "update",
        session: whatsapp
      });
      logger.info(
        `[STATUS_UPDATE] Sessão ${whatsappId} atualizada para: ${status}`
      );
    }
  } catch (error) {
    logger.error(
      `[STATUS_UPDATE] Erro ao atualizar status da sessão ${whatsappId}:`,
      error
    );
  }
};

const handleTargetClosed = async (whatsappId: number): Promise<void> => {
  try {
    logger.error(
      `[TARGET_CLOSED_HANDLER] Iniciando tratamento para sessão ${whatsappId}`
    );
    await updateWhatsAppStatus(whatsappId, "DISCONNECTED");
    setTimeout(async () => {
      try {
        const whatsapp = await Whatsapp.findByPk(whatsappId);
        if (whatsapp) {
          logger.info(
            `[TARGET_CLOSED_HANDLER] Tentando reconectar sessão ${whatsappId}`
          );
          const { StartWhatsAppSession } = await import(
            "./StartWhatsAppSession"
          );
          await StartWhatsAppSession(whatsapp, false);
        }
      } catch (reconnectError) {
        logger.error(
          `[TARGET_CLOSED_HANDLER] Erro na reconexão da sessão ${whatsappId}:`,
          reconnectError
        );
      }
    }, 10000);
  } catch (error) {
    logger.error(
      `[TARGET_CLOSED_HANDLER] Erro no tratamento para sessão ${whatsappId}:`,
      error
    );
  }
};

const wbotMessageListener = (wbot: BaileysSession): void => {
  logger.info(`[WBOT_LISTENER] Registrando listeners para sessão ${wbot.id}`);
  const { sock } = wbot;

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const whatsapp = await Whatsapp.findByPk(wbot.id, { attributes: ["number"] }).catch(() => null);
    const sessionNumberNorm = (whatsapp as any)?.number ? String((whatsapp as any).number).replace(/\D/g, "") : "";
    const norm = (n: string) => (n || "").replace(/\D/g, "");

    for (const msg of messages) {
      const key = msg.key;
      if (key.fromMe && !key.remoteJid) continue;
      if (key.remoteJid === "status@broadcast") continue;
      // Evitar abrir ticket para o próprio número conectado (chat direto consigo mesmo ou eco)
      if (sessionNumberNorm && key.remoteJid && !key.remoteJid.endsWith("@g.us")) {
        const remoteNum = key.remoteJid.replace(/@.*$/, "");
        if (norm(remoteNum) === sessionNumberNorm) {
          logger.info(`[LISTENER] Ignorando mensagem do próprio número conectado (evita ticket): ${remoteNum}`);
          continue;
        }
      }

      const fullMsg = { ...msg, key, message: msg.message };
      const adapter = buildBaileysMessageAdapter(
        fullMsg as any,
        sock,
        wbot.id
      );
      if (adapter.isStatus) continue;
      const msgId = adapter.id.id;
      logger.debug(`[LISTENER] messages.upsert: ${msgId} - fromMe: ${adapter.fromMe}`);
      HandleMessage(adapter, wbot);
    }
  });

  sock.ev.on("messages.update", async (updates) => {
    const list = Array.isArray(updates) ? updates : [updates];
    for (const item of list) {
      const key = item.key ?? item;
      const update = item.update ?? item;
      if (!update?.status || !key?.id) continue;
      const ack = statusToAck(update.status);
      logger.info(
        `[LISTENER] messages.update ack: ${key.id} -> ack=${ack} (${getAckDescription(ack)})`
      );
      HandleMsgAck(key.id, ack);
    }
  });

  sock.ev.on("message-receipt.update", async (receipts) => {
    const list = Array.isArray(receipts) ? receipts : [receipts];
    for (const item of list) {
      const key = item.key ?? item;
      const receipt = item.receipt ?? item;
      const id = key?.id;
      if (!id) continue;
      const status = receipt?.readTimestamp ? 4 : receipt?.receiptTimestamp ? 3 : 2;
      const ack = statusToAck(status);
      logger.info(
        `[LISTENER] message-receipt.update: ${id} -> ack=${ack} (${getAckDescription(ack)})`
      );
      HandleMsgAck(id, ack);
    }
  });

  sock.ev.on("call", async (call) => {
    logger.debug(`[LISTENER] call: ${(call as any)[0]?.id}`);
    VerifyCall(call as any, wbot);
  });

  sock.ev.process(async (events) => {
    if (events["connection.update"]) {
      const update = events["connection.update"] as any;
      if (update?.connection === "close" && update?.lastDisconnect?.error) {
        const msg = String(update.lastDisconnect.error?.message || "").toLowerCase();
        if (msg.includes("target closed") || msg.includes("protocol")) {
          handleTargetClosed(wbot.id);
        }
      }
    }
  });

  logger.info(
    `[WBOT_LISTENER] Todos os listeners registrados para sessão ${wbot.id}`
  );
};

/** Mapeia status do Baileys (WebMessageInfo.Status) para ack do sistema.
 *  Baileys: 0=ERROR, 1=PENDING, 2=SERVER_ACK, 3=DELIVERY_ACK, 4=READ, 5=PLAYED
 *  Nosso: 0=PENDENTE, 1=ENVIADO, 2=ENTREGUE, 3=LIDO, 4=REPRODUZIDO, -1=ERRO */
function statusToAck(status: number | undefined): number {
  if (status === undefined) return 0;
  if (status === 0) return -1;  // ERROR
  if (status === 1) return 0;   // PENDING
  if (status === 2) return 1;   // SERVER_ACK -> ENVIADO
  if (status === 3) return 2;   // DELIVERY_ACK -> ENTREGUE
  if (status === 4) return 3;   // READ -> LIDO
  if (status === 5) return 4;   // PLAYED -> REPRODUZIDO
  return 0;
}

export const getConnectionStatus = (wbot: BaileysSession): string => {
  try {
    if (!wbot) return "NO_WBOT";
    if (wbot.connectionState === "close") return "DISCONNECTED";
    if (wbot.connectionState === "open") return "CONNECTED";
    return wbot.connectionState ?? "UNKNOWN";
  } catch (error) {
    return "ERROR";
  }
};

export const checkSessionHealth = async (wbot: BaileysSession): Promise<boolean> => {
  try {
    return wbot.connectionState === "open";
  } catch (error) {
    logger.error(
      `[HEALTH_CHECK] Erro ao verificar saúde da sessão ${wbot.id}:`,
      error
    );
    return false;
  }
};

export { wbotMessageListener, HandleMessage };
