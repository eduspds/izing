// services/WbotServices/wbotMonitor.ts
// Baileys: conexão e estado são tratados em wbot.ts (connection.update).
// Este módulo mantém exports usados por outros serviços (unblockWhatsAppSession, getBlockStatus).
import type { BaileysSession } from "../../types/baileysAdapter";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";

const qrCodeAttempts = new Map<
  number,
  { attempts: number; lastAttempt: number; blockedUntil?: number; isReconnecting: boolean }
>();

const wbotMonitor = async (_wbot: BaileysSession, whatsapp: Whatsapp): Promise<void> => {
  logger.info(`[MONITOR] Baileys: estado de conexão gerenciado em wbot.ts para ${whatsapp.name}`);
};

export default wbotMonitor;

export const unblockWhatsAppSession = (whatsappId: number): void => {
  qrCodeAttempts.delete(whatsappId);
  logger.info(`🔓 Sessão WhatsApp ${whatsappId} desbloqueada manualmente`);
};

export const getBlockStatus = (whatsappId: number) => qrCodeAttempts.get(whatsappId);
