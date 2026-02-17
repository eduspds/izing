/* eslint-disable camelcase */
/**
 * Gerenciador de sessões WhatsApp usando @whiskeysockets/baileys (Socket-based).
 * Substitui completamente whatsapp-web.js (Puppeteer).
 */
import path from "path";
import { rm } from "fs/promises";
import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
  type proto
} from "@whiskeysockets/baileys";
import pino from "pino";
import { getIO } from "./socket";
import Whatsapp from "../models/Whatsapp";
import { logger as appLogger } from "../utils/logger";
import SyncUnreadMessagesWbot from "../services/WbotServices/SyncUnreadMessagesWbot";
import AppError from "../errors/AppError";
import type { BaileysSession, BaileysContactSimple } from "../types/baileysAdapter";
import { toBaileysJidFromLegacy } from "../types/baileysAdapter";

const AUTH_ROOT = path.resolve(process.cwd(), ".baileys_auth");

/** Cache de mensagens para getMessage (evita memory leak se limitado por sessão) */
const messageStore = new Map<number, Map<string, proto.IWebMessageInfo>>();
const MAX_MESSAGES_PER_SESSION = 500;

/** Cache para contagem de retry de mensagens (exigido pelo Baileys para evitar loop de descriptografia) */
const msgRetryCounterCache = new Map<string, number>();
const msgRetryStore = {
  get: <T>(key: string): T | undefined => msgRetryCounterCache.get(key) as T | undefined,
  set: <T>(key: string, value: T): void => { msgRetryCounterCache.set(key, value as number); },
  del: (key: string): void => { msgRetryCounterCache.delete(key); },
  flushAll: (): void => { msgRetryCounterCache.clear(); }
};

function getMessageStore(whatsappId: number): Map<string, proto.IWebMessageInfo> {
  let store = messageStore.get(whatsappId);
  if (!store) {
    store = new Map();
    messageStore.set(whatsappId, store);
  }
  return store;
}

function trimMessageStore(whatsappId: number): void {
  const store = getMessageStore(whatsappId);
  if (store.size > MAX_MESSAGES_PER_SESSION) {
    const keys = Array.from(store.keys());
    const toDelete = keys.slice(0, store.size - MAX_MESSAGES_PER_SESSION);
    toDelete.forEach(k => store.delete(k));
  }
}

class WhatsAppSessionManager {
  private sessions: Map<number, BaileysSession> = new Map();
  private connectionTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const activeSessions = this.getConnectedSessions();
      if (activeSessions.length > 0) {
        appLogger.debug(
          `[MONITOR] Sessões WhatsApp ativas: ${activeSessions.length}`
        );
      }
    }, 60000);
  }

  /** Remove pasta de autenticação da sessão (por id/tenant) */
  async apagarPastaSessao(id: number | string): Promise<void> {
    const pathSession = path.join(AUTH_ROOT, `session-wbot-${id}`);
    try {
      await rm(pathSession, { recursive: true, force: true });
      appLogger.info(`[CLEANUP] Pasta de sessão removida: ${pathSession}`);
      messageStore.delete(Number(id));
    } catch (error) {
      appLogger.error(`[CLEANUP] Erro ao remover pasta: ${pathSession}`, error);
    }
  }

  async removeWbot(whatsappId: number): Promise<void> {
    try {
      appLogger.info(`[SHUTDOWN] Removendo sessão WhatsApp ID: ${whatsappId}`);

      const timeout = this.connectionTimeouts.get(whatsappId);
      if (timeout) {
        clearTimeout(timeout);
        this.connectionTimeouts.delete(whatsappId);
      }

      const session = this.sessions.get(whatsappId);
      if (session) {
        try {
          session.sock.end(undefined);
          appLogger.info(`[SHUTDOWN] Sessão encerrada: ${whatsappId}`);
        } catch (e) {
          appLogger.warn(`[SHUTDOWN] Erro ao encerrar socket ${whatsappId}:`, e);
        }
        this.sessions.delete(whatsappId);
        messageStore.delete(whatsappId);
      }

      const whatsapp = await Whatsapp.findByPk(whatsappId);
      if (whatsapp) {
        await whatsapp.update({
          status: "DISCONNECTED",
          qrcode: "",
          retries: 0
        });
        const io = getIO();
        io.emit(`${whatsapp.tenantId}:whatsappSession`, {
          action: "update",
          session: whatsapp
        });
      }
    } catch (err) {
      appLogger.error(`[SHUTDOWN] removeWbot | Error: ${err}`);
      this.sessions.delete(whatsappId);
      this.connectionTimeouts.delete(whatsappId);
    }
  }

  async initWbot(whatsapp: Whatsapp): Promise<BaileysSession> {
    if (this.sessions.has(whatsapp.id)) {
      const existing = this.sessions.get(whatsapp.id)!;
      if (existing.connectionState === "open") {
        appLogger.info(
          `[INIT] Sessão ${whatsapp.id} já existe e está conectada, reutilizando`
        );
        return existing;
      }
      await this.removeWbot(whatsapp.id);
      await new Promise(r => setTimeout(r, 2000));
    }

    return new Promise((resolve, reject) => {
      const sessionName = whatsapp.name;
      const authPath = path.join(AUTH_ROOT, `session-wbot-${whatsapp.id}`);

      (async () => {
        try {
          const { state, saveCreds } = await useMultiFileAuthState(authPath);
          let version: [number, number, number];
          const fixedVersion = process.env.BAILEYS_USE_VERSION; // ex: "6.6.0" para contornar conexão fechando imediato
          if (fixedVersion) {
            const parts = fixedVersion.split(".").map(Number);
            version = [parts[0] ?? 6, parts[1] ?? 6, parts[2] ?? 0];
            appLogger.info(`[INIT] Usando versão fixa do Baileys: ${fixedVersion}`);
          } else {
            const fetched = await fetchLatestBaileysVersion();
            version = fetched.version;
          }
          const baileysLogger = pino({ level: "silent" });

          const msgStore = getMessageStore(whatsapp.id);
          const getMessage = async (key: proto.IMessageKey): Promise<proto.IMessage | undefined> => {
            const id = key.id!;
            const jid = key.remoteJid!;
            const stored = msgStore.get(`${jid}_${id}`);
            const msg = stored?.message;
            return msg ?? undefined;
          };

          const sock = makeWASocket({
            version,
            logger: baileysLogger as any,
            auth: {
              creds: state.creds,
              keys: makeCacheableSignalKeyStore(state.keys, baileysLogger as any)
            },
            getMessage,
            generateHighQualityLinkPreview: false,
            msgRetryCounterCache: msgRetryStore,
            syncFullHistory: false
          });

          const session: BaileysSession = {
            sock,
            id: whatsapp.id,
            connectionState: "connecting",
            readyTimestamp: undefined,
            userInitiatedDisconnect: false,
            sendSeen: async (jid: string) => {
              const normalized = toBaileysJidFromLegacy(jid);
              await (sock as any).readMessages?.([{ remoteJid: normalized }]).catch(() => {});
            },
            sendMessage: async (jid: string, content: string, options?: { linkPreview?: boolean }) => {
              const normalized = toBaileysJidFromLegacy(jid);
              return sock.sendMessage(normalized, { text: content }, options as any);
            },
            getContacts: async (): Promise<BaileysContactSimple[]> => {
              const store = (sock as any).store?.contacts;
              if (!store) return [];
              const contacts: BaileysContactSimple[] = [];
              for (const [jid, c] of store) {
                if (jid.endsWith("@s.whatsapp.net")) {
                  const number = jid.split("@")[0];
                  const name = (c as any)?.name ?? (c as any)?.notify ?? number;
                  contacts.push({ number, name, pushname: name, isGroup: false });
                }
              }
              return contacts;
            }
          };
          this.sessions.set(whatsapp.id, session);

          const io = getIO();
          const { tenantId } = whatsapp;

          sock.ev.on("creds.update", saveCreds);

          sock.ev.on("connection.update", async update => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
              appLogger.info(`[QRCODE] Recebido: ${sessionName}`);
              try {
                await whatsapp.update({
                  qrcode: qr,
                  status: "qrcode",
                  retries: 0
                });
                io.emit(`${tenantId}:whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });
              } catch (e) {
                appLogger.error("[QRCODE] Erro:", e);
              }
            }

            if (connection === "connecting") {
              session.connectionState = "connecting";
              try {
                await whatsapp.update({ status: "OPENING" });
                io.emit(`${tenantId}:whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });
              } catch (e) {
                appLogger.error("[CONNECTING] Erro:", e);
              }
            }

            if (connection === "open") {
              session.connectionState = "open";
              session.readyTimestamp = Date.now();
              const user = (sock as any).user;
              // Extrair só o número (Baileys pode retornar "557587113971:0" ou "557587113971@s.whatsapp.net" ou "557587113971@lid")
              const rawId = user?.id ?? "";
              const number = (rawId.split("@")[0].split(":")[0].replace(/\D/g, "") || rawId).trim();

              try {
                await whatsapp.update({
                  status: "CONNECTED",
                  qrcode: "",
                  retries: 0,
                  number,
                  phone: user ? { ...user } : undefined
                });
                io.emit(`${tenantId}:whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });
                io.emit(`${tenantId}:whatsappSession`, {
                  action: "readySession",
                  session: whatsapp
                });

                const t = this.connectionTimeouts.get(whatsapp.id);
                if (t) {
                  clearTimeout(t);
                  this.connectionTimeouts.delete(whatsapp.id);
                }

                void (sock as any).sendPresence?.("available")?.catch(() => {});

                setTimeout(async () => {
                  try {
                    if (await this.isWbotReady(whatsapp.id)) {
                      appLogger.info(
                        `[SYNC] Iniciando sincronização de mensagens: ${sessionName}`
                      );
                      await SyncUnreadMessagesWbot(session, tenantId);
                      appLogger.info(`[SYNC] Sincronização concluída: ${sessionName}`);
                    }
                  } catch (syncErr) {
                    appLogger.error(`[SYNC] Erro: ${sessionName}`, syncErr);
                  }
                }, 15000);

                resolve(session);
              } catch (readyErr) {
                appLogger.error("[READY] Erro:", readyErr);
                reject(readyErr);
              }
            }

            if (connection === "close") {
              session.connectionState = "close";
              const err = lastDisconnect?.error as any;
              const statusCode = err?.output?.statusCode ?? err?.statusCode ?? err?.reason;
              const errMessage = err?.message ?? err?.output?.message ?? String(err);
              if (statusCode === undefined && lastDisconnect) {
                appLogger.warn(`[DISCONNECT] lastDisconnect (debug): ${JSON.stringify(lastDisconnect, (k, v) => (v instanceof Error ? v.message : v))}`);
                appLogger.warn(`[DISCONNECT] Erro bruto: ${errMessage}`);
              }
              const isLogout = statusCode === DisconnectReason.loggedOut;

              if (isLogout || session.userInitiatedDisconnect) {
                appLogger.info(
                  `[DISCONNECT] Sessão encerrada (logout/usuário): ${sessionName}`
                );
                try {
                  await whatsapp.update({
                    status: "DISCONNECTED",
                    qrcode: ""
                  });
                  io.emit(`${tenantId}:whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
                  this.sessions.delete(whatsapp.id);
                  messageStore.delete(whatsapp.id);
                } catch (e) {
                  appLogger.error("[DISCONNECT] Erro:", e);
                }
                if (!session.userInitiatedDisconnect) {
                  reject(new Error("Logged out"));
                }
                return;
              }

              appLogger.warn(
                `[DISCONNECT] Conexão fechada: ${sessionName} - statusCode: ${statusCode ?? "indefinido"}`
              );
              if (statusCode === undefined) {
                appLogger.info(
                  `[DISCONNECT] Dica: se continuar falhando, apague a pasta .baileys_auth/session-wbot-${whatsapp.id} e reinicie para gerar novo QR Code.`
                );
              }
              try {
                await whatsapp.update({
                  status: "DISCONNECTED",
                  qrcode: "",
                  retries: (whatsapp.retries || 0) + 1
                });
                io.emit(`${tenantId}:whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });
              } catch (e) {
                appLogger.error("[DISCONNECT] Erro:", e);
              }

              const { shouldKeepAlive } = await import(
                "../services/WbotServices/StartWhatsAppSession"
              ).catch(() => ({ shouldKeepAlive: () => false }));
              if (shouldKeepAlive(whatsapp.id)) {
                this.scheduleReconnection(whatsapp);
              }
              reject(new Error(`Connection closed: ${statusCode}`));
            }
          });

          sock.ev.on("messages.upsert", async ({ messages, type }) => {
            for (const m of messages) {
              const key = m.key;
              if (key.remoteJid && key.id) {
                msgStore.set(`${key.remoteJid}_${key.id}`, m);
                trimMessageStore(whatsapp.id);
              }
            }
          });

          appLogger.info(`[INIT] Sessão Baileys iniciada: ${sessionName}`);
        } catch (initError) {
          appLogger.error("[INIT] Erro na inicialização:", initError);
          this.sessions.delete(whatsapp.id);
          messageStore.delete(whatsapp.id);
          reject(initError);
        }
      })();
    });
  }

  private scheduleReconnection(whatsapp: Whatsapp): void {
    const existing = this.connectionTimeouts.get(whatsapp.id);
    if (existing) clearTimeout(existing);

    const baseDelay = 30000;
    const delay = Math.min(
      baseDelay * 2 ** (whatsapp.retries || 0),
      120000
    );
    appLogger.info(
      `[RECONNECT] Agendando: ${whatsapp.name} em ${delay}ms (retries: ${whatsapp.retries || 0})`
    );
    const timeout = setTimeout(async () => {
      try {
        await new Promise(r => setTimeout(r, 2000));
        await this.initWbot(whatsapp);
      } catch (e) {
        appLogger.error("[RECONNECT] Erro:", e);
      }
    }, delay);
    this.connectionTimeouts.set(whatsapp.id, timeout);
  }

  async isWbotReady(whatsappId: number): Promise<boolean> {
    const session = this.sessions.get(whatsappId);
    if (!session) return false;
    return session.connectionState === "open";
  }

  async waitForWbotReady(
    whatsappId: number,
    timeoutMs = 10000
  ): Promise<BaileysSession> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const session = this.sessions.get(whatsappId);
      if (!session) throw new AppError("ERR_WAPP_NOT_INITIALIZED");
      if (await this.isWbotReady(whatsappId)) return session;
      await new Promise(r => setTimeout(r, 500));
    }
    throw new AppError("ERR_WAPP_NOT_READY");
  }

  getWbot(whatsappId: number): BaileysSession {
    const session = this.sessions.get(whatsappId);
    if (!session) throw new AppError("ERR_WAPP_NOT_INITIALIZED");
    return session;
  }

  isConnected(whatsappId: number): boolean {
    return this.sessions.has(whatsappId);
  }

  getConnectedSessions(): number[] {
    return Array.from(this.sessions.keys());
  }

  /** Retorna mensagem armazenada no cache (para citações, etc.) */
  getStoredMessage(
    whatsappId: number,
    jid: string,
    messageId: string
  ): proto.IWebMessageInfo | undefined {
    const store = messageStore.get(whatsappId);
    if (!store) return undefined;
    return store.get(`${jid}_${messageId}`);
  }

  async shutdown(): Promise<void> {
    appLogger.info("[SHUTDOWN] Encerrando todas as sessões...");
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    const ids = Array.from(this.sessions.keys());
    this.connectionTimeouts.forEach(t => clearTimeout(t));
    this.connectionTimeouts.clear();
    await Promise.all(ids.map(id => this.removeWbot(id)));
    appLogger.info("[SHUTDOWN] Todas as sessões encerradas");
  }
}

export const whatsAppManager = new WhatsAppSessionManager();

export const removeWbot = (whatsappId: number) =>
  whatsAppManager.removeWbot(whatsappId);
export const initWbot = (whatsapp: Whatsapp) =>
  whatsAppManager.initWbot(whatsapp);
export const getWbot = (whatsappId: number) =>
  whatsAppManager.getWbot(whatsappId);
export const isWbotReady = (whatsappId: number) =>
  whatsAppManager.isWbotReady(whatsappId);
export const apagarPastaSessao = (id: number | string) =>
  whatsAppManager.apagarPastaSessao(id);

export default whatsAppManager;
