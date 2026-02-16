/**
 * Tipos e adapters para integração Baileys com os serviços existentes.
 * Mantém interface compatível com o que era usado com WWebJS (msg.id, msg.body, msg.fromMe, etc.)
 */

import type { WASocket, proto, WAMessage, WAMessageKey, Contact as BaileysContact } from "@whiskeysockets/baileys";

/** JID no formato Baileys: número@s.whatsapp.net (individual) ou id@g.us (grupo) */
export type BaileysJid = string;

/** Contato retornado por getContacts (compatível com Import/Sync) */
export interface BaileysContactSimple {
  number: string;
  name?: string;
  pushname?: string;
  isGroup?: boolean;
}

/** Sessão WhatsApp = socket Baileys + id da conexão (whatsappId) */
export interface BaileysSession {
  sock: WASocket;
  id: number;
  /** Estado de conexão para health check */
  connectionState?: "open" | "connecting" | "close";
  /** Timestamp quando ficou ready (open) */
  readyTimestamp?: number;
  /** Flag para desconexão iniciada pelo usuário */
  userInitiatedDisconnect?: boolean;
  /** Marcar chat como lido (Baileys: readMessages) */
  sendSeen: (jid: string) => Promise<void>;
  /** Enviar mensagem de texto (compatível com job BusinessHours) */
  sendMessage: (jid: string, content: string, options?: { linkPreview?: boolean }) => Promise<unknown>;
  /** Lista de contatos (Baileys não expõe todos; pode retornar [] se sem store) */
  getContacts: () => Promise<BaileysContactSimple[]>;
}

/** Mínimo necessário para VerifyStepsChatFlowTicket / verifyBusinessHours (Instagram/Telegram) */
export type MessageLikeMinimal = { fromMe: boolean; body?: string; timestamp?: number };

/**
 * Converte número + tipo para JID Baileys.
 * - Grupo: xxx@g.us
 * - Individual: number@s.whatsapp.net (número com menos de 15 dígitos)
 * - Individual (internacional/longo): number@lid (15+ dígitos) — evita erro "no lid for user" do WhatsApp.
 * Ver BAILEYS_DDD_DDI.md para DDD/DDI e uso de @lid.
 */
export function toBaileysJid(number: string, isGroup: boolean): BaileysJid {
  const clean = number.replace(/\D/g, "");
  if (isGroup) {
    return `${clean}@g.us`;
  }
  return clean.length >= 15 ? `${clean}@lid` : `${clean}@s.whatsapp.net`;
}

/**
 * Converte JID legado @c.us ou @g.us para formato Baileys quando necessário.
 * Baileys aceita @s.whatsapp.net para individual; @g.us para grupo.
 */
export function toBaileysJidFromLegacy(legacyJid: string): BaileysJid {
  if (legacyJid.endsWith("@s.whatsapp.net") || legacyJid.endsWith("@g.us")) {
    return legacyJid;
  }
  const normalized = legacyJid
    .replace(/@c\.us$/i, "@s.whatsapp.net")
    .replace(/@g\.us$/i, "@g.us");
  return normalized || legacyJid;
}

/**
 * Extrai número (ou id de grupo) do JID.
 */
export function jidToNumber(jid: string): string {
  if (!jid) return "";
  return jid.split("@")[0] || "";
}

/**
 * Interface de mensagem compatível com os serviços que antes usavam WWebJS Message.
 * Os helpers (VerifyMessage, VerifyMediaMessage, HandleMessage, etc.) usam esta interface.
 */
export interface IBaileysMessageAdapter {
  id: { id: string; _serialized?: string };
  from: string;
  to?: string;
  body: string;
  type: string;
  fromMe: boolean;
  hasMedia: boolean;
  hasQuotedMsg: boolean;
  isStatus?: boolean;
  timestamp: number;
  /** Contato (objeto compatível com VerifyContact) */
  getContact: () => Promise<IContactAdapter>;
  /** Chat (name, isGroup, unreadCount) */
  getChat: () => Promise<IChatAdapter>;
  getQuotedMessage: () => Promise<IBaileysMessageAdapter | null>;
  downloadMedia: () => Promise<IMediaData | undefined>;
}

export interface IContactAdapter {
  id: { user: string; _serialized: string };
  name?: string;
  pushname?: string;
  shortName?: string;
  isUser?: boolean;
  isWAContact?: boolean;
  isGroup?: boolean;
  getProfilePicUrl: () => Promise<string | undefined>;
}

export interface IChatAdapter {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
}

export interface IMediaData {
  data: Buffer;
  mimetype: string;
  filename?: string;
}
