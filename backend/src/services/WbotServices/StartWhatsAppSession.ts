import Whatsapp from "../../models/Whatsapp";
import { whatsAppManager } from "../../libs/wbot";
import { wbotMessageListener } from "./wbotMessageListener";
import wbotMonitor from "./wbotMonitor";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import AppError from "../../errors/AppError";

// ✅ CONTROLE UNIFICADO DE SESSÕES
const sessionManager = new Map<
  number,
  {
    lastActivity: number;
    isUserInitiated: boolean;
    keepAlive: boolean;
    attempts: number;
    lastAttempt: number;
    heartbeatInterval?: NodeJS.Timeout;
    isShuttingDown: boolean;
  }
>();

// ✅ Verificação de saúde para Baileys (connectionState)
const isWbotHealthy = async (wbot: any): Promise<boolean> => {
  try {
    if (!wbot) return false;
    return wbot.connectionState === "open";
  } catch (error) {
    logger.error("[HEALTH CHECK] Erro na verificação de saúde:", error);
    return false;
  }
};

// ✅ AGUARDAR ATÉ QUE O WHATSAPP ESTEJA REALMENTE PRONTO
const waitForWhatsAppReady = async (
  wbot: any,
  timeoutMs = 20000
): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const isHealthy = await isWbotHealthy(wbot);

      if (isHealthy) {
        logger.info("[READY CHECK] WhatsApp está pronto e conectado");
        return true;
      }

      // Aguardar antes da próxima verificação
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      logger.warn(
        "[READY CHECK] Erro durante verificação de prontidão:",
        error
      );
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  logger.error("[READY CHECK] Timeout aguardando WhatsApp ficar pronto");
  return false;
};

// ✅ PREVENÇÃO DE CONFLITO DE SESSÕES
const ensureNoSessionConflict = async (
  whatsappId: number
): Promise<boolean> => {
  try {
    const existingSession = sessionManager.get(whatsappId);

    if (existingSession && existingSession.isShuttingDown) {
      logger.warn(
        `[CONFLICT PREVENTION] Sessão ${whatsappId} está em processo de shutdown, aguardando...`
      );
      await new Promise(resolve => setTimeout(resolve, 5000));
      return false;
    }

    // ✅ VERIFICAR SE JÁ EXISTE UMA SESSÃO ATIVA NO MANAGER
    if (whatsAppManager.isConnected(whatsappId)) {
      const wbot = whatsAppManager.getWbot(whatsappId);
      const isHealthy = await isWbotHealthy(wbot);

      if (isHealthy) {
        logger.info(
          `[CONFLICT PREVENTION] Sessão ${whatsappId} já está ativa e saudável`
        );
        return true;
      }
      logger.warn(
        `[CONFLICT PREVENTION] Sessão ${whatsappId} existe mas não está saudável, removendo...`
      );

      // ✅ MARCAR COMO EM SHUTDOWN PARA EVITAR CONFLITOS
      if (existingSession) {
        existingSession.isShuttingDown = true;
        sessionManager.set(whatsappId, existingSession);
      }

      await whatsAppManager.removeWbot(whatsappId);
      await new Promise(resolve => setTimeout(resolve, 10000)); // ✅ Delay maior para cleanup completo

      // ✅ REMOVER MARCAÇÃO DE SHUTDOWN
      if (existingSession) {
        existingSession.isShuttingDown = false;
      }
    }

    return false;
  } catch (error) {
    logger.error(
      `[CONFLICT PREVENTION] Erro ao verificar conflito de sessão ${whatsappId}:`,
      error
    );
    return false;
  }
};

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  isUserInitiated = false
): Promise<void> => {
  const session = sessionManager.get(whatsapp.id);
  const now = Date.now();

  // ✅ VERIFICAR SE ESTÁ BLOQUEADO POR MUITAS TENTATIVAS
  if (session && session.attempts >= 5) {
    const timeSinceLastAttempt = now - session.lastAttempt;
    const blockDuration = Math.min(
      300000, // 5 minutos máximo
      30000 * Math.pow(2, session.attempts - 5) // Backoff exponencial
    );

    if (timeSinceLastAttempt < blockDuration) {
      const remainingMinutes = Math.ceil(
        (blockDuration - timeSinceLastAttempt) / 60000
      );
      logger.warn(
        `🚫 Sessão ${whatsapp.name} bloqueada por ${remainingMinutes}min - Muitas tentativas falhas`
      );
      return;
    }
  }

  try {
    logger.info(
      `[START] === INICIANDO SESSÃO: ${whatsapp.name} (ID: ${whatsapp.id}) ===`
    );

    // ✅ PREVENÇÃO DE CONFLITO DE SESSÕES
    const hasActiveSession = await ensureNoSessionConflict(whatsapp.id);
    if (hasActiveSession) {
      updateSessionActivity(whatsapp.id, isUserInitiated);
      return;
    }

    // ✅ ATUALIZAR STATUS PARA ABRINDO
    await whatsapp.update({ status: "OPENING" });

    const io = getIO();
    io.emit(`${whatsapp.tenantId}:whatsappSession`, {
      action: "update",
      session: whatsapp
    });

    logger.info(`[START] Inicializando Wbot para: ${whatsapp.name}`);

    // ✅ INICIALIZAR WHATSAPP COM TRATAMENTO DE ERRO ESPECÍFICO
    let wbot;
    try {
      wbot = await whatsAppManager.initWbot(whatsapp);
    } catch (initError) {
      logger.error(
        `[START] Erro na inicialização do Wbot para ${whatsapp.name}:`,
        initError
      );
      throw new AppError(`Falha na inicialização: ${initError.message}`, 500);
    }

    if (!wbot) {
      throw new AppError(
        "Falha crítica na inicialização do Wbot - instância nula",
        500
      );
    }

    // ✅ AGUARDAR O WHATSAPP FICAR COMPLETAMENTE PRONTO
    logger.info(`[START] Aguardando WhatsApp ficar pronto: ${whatsapp.name}`);
    const isReady = await waitForWhatsAppReady(wbot, 25000);

    if (!isReady) {
      // ✅ TENTAR VERIFICAR SE HÁ ALGUM PROBLEMA ESPECÍFICO
      const finalHealthCheck = await isWbotHealthy(wbot);
      if (!finalHealthCheck) {
        throw new AppError(
          "WhatsApp não ficou pronto dentro do tempo limite",
          500
        );
      }
      logger.warn(
        "[START] WhatsApp passou na verificação final mas não no tempo limite"
      );
    }

    // ✅ REGISTRAR LISTENERS COM TRATAMENTO DE ERRO
    logger.info(`[START] Registrando listeners para: ${whatsapp.name}`);
    try {
      wbotMessageListener(wbot);
      wbotMonitor(wbot, whatsapp);
    } catch (listenerError) {
      logger.error(
        `[START] Erro ao registrar listeners para ${whatsapp.name}:`,
        listenerError
      );
      throw new AppError(
        `Falha ao registrar listeners: ${listenerError.message}`,
        500
      );
    }

    // ✅ ATUALIZAR CONTROLE DE SESSÃO (resetar tentativas em caso de sucesso)
    updateSessionManager(whatsapp.id, isUserInitiated, true);

    // ✅ INICIAR HEARTBEAT
    startHeartbeat(whatsapp.id, wbot);

    // ✅ ATUALIZAR STATUS PARA CONECTADO
    await whatsapp.update({
      status: "CONNECTED",
      qrcode: null
    });

    io.emit(`${whatsapp.tenantId}:whatsappSession`, {
      action: "update",
      session: whatsapp
    });

    logger.info(`[START] ✅ Sessão iniciada com sucesso: ${whatsapp.name}`);

    // ✅ MONITORAMENTO CONTÍNUO PARA DETECTAR "TARGET CLOSED"
    startTargetClosedMonitor(whatsapp.id, wbot);
  } catch (error: any) {
    logger.error(`[START] ❌ ERRO ao iniciar sessão ${whatsapp.name}:`, error);

    // ✅ ATUALIZAR CONTADOR DE TENTATIVAS FALHAS
    updateSessionManager(whatsapp.id, isUserInitiated, false);

    try {
      await whatsapp.update({
        status: "DISCONNECTED",
        qrcode: null
      });

      const io = getIO();
      io.emit(`${whatsapp.tenantId}:whatsappSession`, {
        action: "update",
        session: whatsapp
      });
    } catch (updateError) {
      logger.error("[START] Erro ao atualizar status:", updateError);
    }

    // ✅ RECONEXÃO INTELIGENTE - APENAS SE DEVE MANTER E NÃO ESTÁ BLOQUEADO
    const currentSession = sessionManager.get(whatsapp.id);
    if (currentSession?.keepAlive && (currentSession.attempts || 0) < 8) {
      const reconnectDelay = Math.min(
        60000, // 1 minuto máximo
        15000 * ((currentSession.attempts || 0) + 1) // Backoff progressivo
      );
      logger.info(
        `[START] Agendando reconexão em ${reconnectDelay / 1000}s para: ${
          whatsapp.name
        } (tentativa ${(currentSession.attempts || 0) + 1})`
      );

      setTimeout(() => {
        StartWhatsAppSession(whatsapp, false).catch(err => {
          logger.error(
            `[START] Erro na reconexão agendada: ${whatsapp.name}`,
            err
          );
        });
      }, reconnectDelay);
    } else if ((currentSession?.attempts || 0) >= 8) {
      logger.error(
        `🚫 Sessão ${whatsapp.name} com muitas falhas, reconexão automática desabilitada`
      );
    }
  }
};

// ✅ Monitor de saúde para Baileys (connectionState)
const startTargetClosedMonitor = (whatsappId: number, wbot: any): void => {
  const monitorInterval = setInterval(async () => {
    try {
      const session = sessionManager.get(whatsappId);
      if (!session || !session.keepAlive) {
        clearInterval(monitorInterval);
        return;
      }
      const isHealthy = await isWbotHealthy(wbot);
      if (!isHealthy) {
        clearInterval(monitorInterval);
        logger.warn(`[TARGET MONITOR] Sessão ${whatsappId} não saudável. Reconexão via StartWhatsAppSession.`);
        setTimeout(async () => {
          try {
            const whatsapp = await Whatsapp.findByPk(whatsappId);
            if (whatsapp && sessionManager.get(whatsappId)?.keepAlive) {
              await StartWhatsAppSession(whatsapp, false);
            }
          } catch (error) {
            logger.error(`[TARGET MONITOR] Erro na reconexão: ${whatsappId}`, error);
          }
        }, 5000);
      }
    } catch (error) {
      logger.error(`[TARGET MONITOR] Erro: ${whatsappId}`, error);
      clearInterval(monitorInterval);
    }
  }, 10000);
};

// ✅ CONTROLE DE SESSÃO UNIFICADO
const updateSessionManager = (
  whatsappId: number,
  isUserInitiated: boolean,
  isSuccess: boolean
): void => {
  const now = Date.now();
  const existingSession = sessionManager.get(whatsappId);
  const session = existingSession || {
    lastActivity: now,
    isUserInitiated: false,
    keepAlive: true,
    attempts: 0,
    lastAttempt: now,
    isShuttingDown: false
  };

  session.lastActivity = now;
  session.isUserInitiated = session.isUserInitiated || isUserInitiated;
  session.isShuttingDown = false; // Resetar flag de shutdown

  if (isSuccess) {
    // ✅ Resetar tentativas em caso de sucesso
    session.attempts = 0;
    logger.debug(
      `[SESSION] Sessão ${whatsappId} - Reset de tentativas (sucesso)`
    );
  } else {
    // ✅ Incrementar tentativas em caso de falha
    session.attempts++;
    session.lastAttempt = now;
    logger.warn(
      `[SESSION] Sessão ${whatsappId} - Tentativa ${session.attempts} falhou`
    );
  }

  sessionManager.set(whatsappId, session);
};

// ✅ Heartbeat com verificação de saúde
const startHeartbeat = (whatsappId: number, wbot: any): void => {
  // ✅ LIMPAR HEARTBEAT ANTERIOR SE EXISTIR
  const existingSession = sessionManager.get(whatsappId);
  if (existingSession?.heartbeatInterval) {
    clearInterval(existingSession.heartbeatInterval);
    logger.debug(`[HEARTBEAT] Heartbeat anterior limpo: ${whatsappId}`);
  }

  const heartbeatInterval = setInterval(async () => {
    try {
      const session = sessionManager.get(whatsappId);

      if (!session || !session.keepAlive) {
        logger.info(
          `[HEARTBEAT] Parando heartbeat - sessão não deve manter: ${whatsappId}`
        );
        clearInterval(heartbeatInterval);
        return;
      }

      // ✅ VERIFICAÇÃO DE SAÚDE NO HEARTBEAT
      const isHealthy = await isWbotHealthy(wbot);

      if (!isHealthy) {
        logger.warn(
          `[HEARTBEAT] Sessão ${whatsappId} não está saudável, parando heartbeat`
        );
        clearInterval(heartbeatInterval);

        // Tentar reconexão automática
        if (session.keepAlive && !session.isShuttingDown) {
          logger.info(
            `[HEARTBEAT] Tentando reconexão automática: ${whatsappId}`
          );
          setTimeout(async () => {
            try {
              const whatsapp = await Whatsapp.findByPk(whatsappId);
              if (whatsapp) {
                await StartWhatsAppSession(whatsapp, false);
              }
            } catch (error) {
              logger.error(
                `[HEARTBEAT] Erro na reconexão automática: ${whatsappId}`,
                error
              );
            }
          }, 10000);
        }
        return;
      }

      // ✅ ATIVIDADE PERIÓDICA
      if (Date.now() - session.lastActivity > 5 * 60 * 1000) {
        logger.debug(`[HEARTBEAT] Sessão ativa: ${whatsappId}`);
        session.lastActivity = Date.now();
        sessionManager.set(whatsappId, session);
      }
    } catch (error) {
      logger.error(`[HEARTBEAT] Erro: ${whatsappId}`, error);
      clearInterval(heartbeatInterval);
    }
  }, 30000); // Verificar a cada 30 segundos

  // ✅ SALVAR REFERÊNCIA DO INTERVALO
  const session = sessionManager.get(whatsappId);
  if (session) {
    session.heartbeatInterval = heartbeatInterval;
    sessionManager.set(whatsappId, session);
    logger.info(`[HEARTBEAT] Heartbeat iniciado: ${whatsappId}`);
  }
};

// ✅ Atualizar atividade (para uso externo)
export const updateSessionActivity = (
  whatsappId: number,
  isUserInitiated = false
): void => {
  const session = sessionManager.get(whatsappId);
  if (session) {
    session.lastActivity = Date.now();
    if (isUserInitiated) {
      session.isUserInitiated = true;
    }
    sessionManager.set(whatsappId, session);
    logger.debug(`[SESSION] Atividade atualizada: ${whatsappId}`);
  }
};

// ✅ Fechar sessão
export const closeUserSession = async (whatsappId: number): Promise<void> => {
  const session = sessionManager.get(whatsappId);
  if (session) {
    session.keepAlive = false;
    session.isShuttingDown = true; // ✅ MARCAR COMO EM SHUTDOWN

    // ✅ LIMPAR HEARTBEAT
    if (session.heartbeatInterval) {
      clearInterval(session.heartbeatInterval);
      logger.debug(`[CLOSE] Heartbeat parado: ${whatsappId}`);
    }

    sessionManager.delete(whatsappId);

    logger.info(`[CLOSE] Fechando sessão: ${whatsappId}`);

    try {
      await whatsAppManager.removeWbot(whatsappId);
    } catch (error) {
      logger.error(`[CLOSE] Erro ao remover wbot: ${whatsappId}`, error);
    }

    try {
      const whatsapp = await Whatsapp.findByPk(whatsappId);
      if (whatsapp) {
        await whatsapp.update({
          status: "DISCONNECTED",
          qrcode: null
        });

        const io = getIO();
        io.emit(`${whatsapp.tenantId}:whatsappSession`, {
          action: "update",
          session: whatsapp
        });

        logger.info(`[CLOSE] Sessão fechada com sucesso: ${whatsappId}`);
      }
    } catch (error) {
      logger.error(
        `[CLOSE] Erro ao atualizar status no banco: ${whatsappId}`,
        error
      );
    }
  } else {
    logger.warn(
      `[CLOSE] Tentativa de fechar sessão inexistente: ${whatsappId}`
    );
  }
};

// ✅ Verificar se deve manter
export const shouldKeepAlive = (whatsappId: number): boolean => {
  const session = sessionManager.get(whatsappId);
  return session?.keepAlive === true;
};

// ✅ Obter status da sessão (para debugging)
export const getSessionStatus = (whatsappId: number) => {
  return sessionManager.get(whatsappId);
};

// ✅ Limpar todas as sessões (para shutdown)
export const cleanupAllSessions = async (): Promise<void> => {
  logger.info("[CLEANUP] Iniciando limpeza de todas as sessões");

  const sessionIds = Array.from(sessionManager.keys());

  for (const sessionId of sessionIds) {
    try {
      await closeUserSession(sessionId);
    } catch (error) {
      logger.error(`[CLEANUP] Erro ao limpar sessão ${sessionId}:`, error);
    }
  }

  logger.info("[CLEANUP] Todas as sessões foram limpas");
};
