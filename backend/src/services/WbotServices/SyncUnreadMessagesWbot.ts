import type { BaileysSession } from "../../types/baileysAdapter";
import { logger } from "../../utils/logger";

/**
 * No Baileys não há API equivalente ao getChats() do WWebJS para listar chats e mensagens não lidas.
 * As mensagens chegam em tempo real via messages.upsert no wbotMessageListener.
 * Esta função é mantida para compatibilidade com o fluxo de init (chamada após "open")
 * e não realiza sincronização de histórico.
 */
const SyncUnreadMessagesWbot = async (
  wbot: BaileysSession,
  _tenantId: number | string
): Promise<void> => {
  try {
    if (wbot.connectionState !== "open") {
      logger.warn("[SYNC] Wbot não está conectado. Sincronização de histórico não disponível com Baileys.");
      return;
    }
    logger.info("[SYNC] Baileys: mensagens em tempo real via messages.upsert. Sem sync de histórico.");
  } catch (error) {
    logger.warn("[SYNC] Erro:", error);
  }
};

export default SyncUnreadMessagesWbot;
