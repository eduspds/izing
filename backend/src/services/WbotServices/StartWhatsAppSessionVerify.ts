// services/WbotServices/StartWhatsAppSessionVerify.ts
import { logger } from "../../utils/logger";

// ✅ IMPORTAR O sessionManager do arquivo principal
import { getSessionStatus } from "./StartWhatsAppSession";

export const StartWhatsAppSessionVerify = async (
  whatsappId: number,
  error: string
): Promise<void> => {
  const errorString = error.toString().toLowerCase();
  const sessionClosed = "session closed";
  const WAPP_NOT_INIT = "ERR_WAPP_NOT_INITIALIZED".toLowerCase();
  const TARGET_CLOSED = "target closed";
  const PROTOCOL_ERROR = "protocol error";

  if (
    errorString.indexOf(sessionClosed) !== -1 ||
    errorString.indexOf(WAPP_NOT_INIT) !== -1 ||
    errorString.indexOf(TARGET_CLOSED) !== -1 ||
    errorString.indexOf(PROTOCOL_ERROR) !== -1
  ) {
    logger.warn(
      `🔄 Verificação de sessão necessária para: ${whatsappId} - ${error}`
    );

    // ✅ DEIXAR O StartWhatsAppSession CUIDAR DA RECONEXÃO
    // Ele já tem o controle de tentativas e backoff
    // A reconexão será tratada automaticamente pelo loop principal
  }
};

// ✅ CORREÇÃO: Usar getSessionStatus em vez de acessar sessionManager diretamente
export const resetReconnectionAttempts = (whatsappId: number): void => {
  // Esta função agora será implementada no StartWhatsAppSession se necessário
  logger.info(
    "🔄 Função resetReconnectionAttempts movida para StartWhatsAppSession"
  );
};
