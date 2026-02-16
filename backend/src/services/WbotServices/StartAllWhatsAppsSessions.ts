// services/WbotServices/StartAllWhatsAppsSessions.ts
import { Op } from "sequelize";
import Whatsapp from "../../models/Whatsapp";
import { StartInstaBotSession } from "../InstagramBotServices/StartInstaBotSession";
import { StartMessengerBot } from "../MessengerChannelServices/StartMessengerBot";
import { StartTbotSession } from "../TbotServices/StartTbotSession";
import { StartWaba360 } from "../WABA360/StartWaba360";
import { StartWhatsAppSession, getSessionStatus } from "./StartWhatsAppSession";
import { logger } from "../../utils/logger";

// ✅ CONTROLE DE INICIALIZAÇÃO GLOBAL
let isInitializing = false;
const initializationQueue: Array<() => Promise<void>> = [];

export const StartAllWhatsAppsSessions = async (): Promise<void> => {
  // ✅ PREVENIR MÚLTIPLAS INICIALIZAÇÕES SIMULTÂNEAS
  if (isInitializing) {
    logger.warn("[STARTALL] ⚠️ Inicialização já em andamento, ignorando...");
    return;
  }

  try {
    isInitializing = true;
    logger.info("[STARTALL] 🚀 Iniciando todas as sessões...");

    const whatsapps = await Whatsapp.findAll({
      where: {
        [Op.or]: [
          {
            [Op.and]: {
              type: {
                [Op.in]: ["instagram", "telegram", "waba", "messenger"]
              },
              status: {
                [Op.notIn]: ["DISCONNECTED"]
              }
            }
          },
          {
            [Op.and]: {
              type: "whatsapp",
              isActive: true
            }
          }
        ],
        isActive: true
      },
      order: [
        ["type", "ASC"],
        ["name", "ASC"]
      ]
    });

    logger.info(`[STARTALL] 📊 ${whatsapps.length} canais encontrados`);

    const whatsappSessions = whatsapps.filter(w => w.type === "whatsapp");
    const telegramSessions = whatsapps.filter(
      w => w.type === "telegram" && !!w.tokenTelegram
    );
    const instagramSessions = whatsapps.filter(w => w.type === "instagram");
    const waba360Sessions = whatsapps.filter(w => w.type === "waba");
    const messengerSessions = whatsapps.filter(w => w.type === "messenger");

    logger.info(`[STARTALL] WhatsApp: ${whatsappSessions.length}`);
    logger.info(`[STARTALL] Telegram: ${telegramSessions.length}`);
    logger.info(`[STARTALL] Instagram: ${instagramSessions.length}`);
    logger.info(`[STARTALL] WABA 360: ${waba360Sessions.length}`);
    logger.info(`[STARTALL] Messenger: ${messengerSessions.length}`);

    // ✅ INICIALIZAÇÃO SEQUENCIAL COM CONTROLE DE SAÚDE
    if (whatsappSessions.length > 0) {
      await initializeWhatsAppSessions(whatsappSessions);
    }

    // ✅ OUTRAS SESSÕES COM LIMITES
    await initializeOtherSessions([
      {
        name: "Telegram",
        sessions: telegramSessions,
        starter: StartTbotSession
      },
      {
        name: "WABA 360",
        sessions: waba360Sessions,
        starter: StartWaba360
      },
      {
        name: "Instagram",
        sessions: instagramSessions,
        starter: StartInstaBotSession
      },
      {
        name: "Messenger",
        sessions: messengerSessions,
        starter: StartMessengerBot
      }
    ]);

    logger.info("[STARTALL] ✅ Todas as sessões processadas com sucesso");
  } catch (error) {
    logger.error("[STARTALL] 💥 Erro geral ao iniciar sessões:", error);
  } finally {
    isInitializing = false;
  }
};

// ✅ FUNÇÃO ESPECIALIZADA PARA WHATSAPP
const initializeWhatsAppSessions = async (
  sessions: Whatsapp[]
): Promise<void> => {
  logger.info("[STARTALL] 🔄 Iniciando sessões WhatsApp sequencialmente...");

  for (let i = 0; i < sessions.length; i++) {
    const whatsapp = sessions[i];

    // ✅ VERIFICAR SE JÁ ESTÁ SAUDÁVEL ANTES DE INICIAR
    const existingStatus = getSessionStatus(whatsapp.id);
    if (existingStatus && existingStatus.attempts === 0) {
      logger.info(
        `[STARTALL] ⏩ WhatsApp ${whatsapp.name} já está saudável, pulando...`
      );
      continue;
    }

    try {
      logger.info(
        `[STARTALL] 📱 WhatsApp ${i + 1}/${sessions.length}: ${whatsapp.name}`
      );

      await StartWhatsAppSession(whatsapp);

      // ✅ DELAY PROGRESSIVO INTELIGENTE
      const baseDelay = 8000; // 8 segundos base
      const positionDelay = i * 3000; // 3 segundos extras por posição
      const delay = Math.min(25000, baseDelay + positionDelay); // Máximo 25 segundos

      if (i < sessions.length - 1) {
        logger.info(
          `[STARTALL] ⏳ Aguardando ${delay}ms antes da próxima sessão WhatsApp...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      logger.error(`[STARTALL] ❌ Erro ao iniciar ${whatsapp.name}:`, error);

      // ✅ DELAY MAIOR EM CASO DE ERRO
      const errorDelay = 10000; // 10 segundos
      if (i < sessions.length - 1) {
        logger.warn(`[STARTALL] ⚠️ Aguardando ${errorDelay}ms após erro...`);
        await new Promise(resolve => setTimeout(resolve, errorDelay));
      }
    }
  }
};

// ✅ FUNÇÃO PARA OUTRAS SESSÕES
const initializeOtherSessions = async (
  sessionConfigs: Array<{
    name: string;
    sessions: Whatsapp[];
    starter: (whatsapp: Whatsapp) => Promise<void>;
  }>
): Promise<void> => {
  for (const { name, sessions, starter } of sessionConfigs) {
    if (sessions.length === 0) continue;

    logger.info(
      `[STARTALL] 🔄 Iniciando ${sessions.length} sessões ${name}...`
    );

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      try {
        await starter(session);

        // ✅ DELAY ENTRE SESSÕES DO MESMO TIPO
        const delay = 3000; // 3 segundos
        if (i < sessions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        logger.error(`[STARTALL] ❌ Erro ${name} ${session.name}:`, error);

        // ✅ CONTINUAR MESMO COM ERRO, MAS COM DELAY
        if (i < sessions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
  }
};

// ✅ FUNÇÃO PARA INICIALIZAÇÃO SEGURAMENTE EM BACKGROUND
export const safeStartAllSessions = async (): Promise<void> => {
  try {
    await StartAllWhatsAppsSessions();
  } catch (error) {
    logger.error("[SAFE_START] Erro na inicialização segura:", error);
  }
};

// ✅ FUNÇÃO PARA REINICIAR SESSÕES ESPECÍFICAS
export const restartWhatsAppSession = async (
  whatsappId: number
): Promise<void> => {
  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp || !whatsapp.isActive) {
      logger.warn(`[RESTART] WhatsApp ${whatsappId} não encontrado ou inativo`);
      return;
    }

    logger.info(`[RESTART] Reiniciando sessão: ${whatsapp.name}`);
    await StartWhatsAppSession(whatsapp, true);
  } catch (error) {
    logger.error(`[RESTART] Erro ao reiniciar sessão ${whatsappId}:`, error);
  }
};

// ✅ FUNÇÃO PARA VERIFICAR STATUS DE TODAS AS SESSÕES
export const getSessionsStatus = async (): Promise<{
  total: number;
  whatsapp: number;
  other: number;
  healthy: number;
  withErrors: number;
}> => {
  const whatsapps = await Whatsapp.findAll({
    where: { isActive: true },
    attributes: ["id", "type", "name", "status"]
  });

  let healthyCount = 0;
  let errorCount = 0;

  whatsapps.forEach(whatsapp => {
    const sessionStatus = getSessionStatus(whatsapp.id);
    if (sessionStatus && sessionStatus.attempts === 0) {
      healthyCount++;
    } else if (sessionStatus && sessionStatus.attempts > 0) {
      errorCount++;
    }
  });

  const whatsappCount = whatsapps.filter(w => w.type === "whatsapp").length;
  const otherCount = whatsapps.filter(w => w.type !== "whatsapp").length;

  return {
    total: whatsapps.length,
    whatsapp: whatsappCount,
    other: otherCount,
    healthy: healthyCount,
    withErrors: errorCount
  };
};
