/**
 * Constrói IBaileysMessageAdapter a partir de WAMessage do Baileys.
 * Mantém compatibilidade com os serviços que usavam WWebJS Message.
 */

import type { WASocket, proto } from "@whiskeysockets/baileys";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import type {
  IBaileysMessageAdapter,
  IContactAdapter,
  IChatAdapter,
  IMediaData
} from "../types/baileysAdapter";
import { jidToNumber } from "../types/baileysAdapter";

type WAMessageFull = proto.IWebMessageInfo & { key: proto.IMessageKey; message?: proto.IMessage };

function getMessageType(msg: proto.IMessage | undefined): string {
  if (!msg) return "chat";
  if (msg.conversation || msg.extendedTextMessage) return "chat";
  if (msg.imageMessage) return "image";
  if (msg.videoMessage) return "video";
  if (msg.audioMessage) return msg.audioMessage.ptt ? "ptt" : "audio";
  if (msg.documentMessage) return "document";
  if (msg.stickerMessage) return "sticker";
  if (msg.contactMessage) return "vcard";
  if (msg.contactsArrayMessage) return "vcard";
  return "chat";
}

function getMessageBody(msg: proto.IMessage | undefined): string {
  if (!msg) return "";
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  if (msg.videoMessage?.caption) return msg.videoMessage.caption;
  if (msg.documentMessage?.caption) return msg.documentMessage.caption;
  return "";
}

function hasQuotedMsg(msg: proto.IMessage | undefined): boolean {
  if (!msg) return false;
  const ext = msg.extendedTextMessage?.contextInfo ?? msg.imageMessage?.contextInfo ?? msg.videoMessage?.contextInfo ?? msg.documentMessage?.contextInfo;
  return !!(ext?.quotedMessage);
}

export function buildBaileysMessageAdapter(
  waMessage: WAMessageFull,
  sock: WASocket,
  sessionId: number
): IBaileysMessageAdapter {
  const key = waMessage.key;
  const msg = waMessage.message;
  const remoteJid = key.remoteJid!;
  const fromMe = key.fromMe ?? false;
  const participant = key.participant ?? remoteJid;
  const id = key.id!;
  const type = getMessageType(msg);
  const body = getMessageBody(msg);
  const hasMedia = !!(
    msg?.imageMessage ||
    msg?.videoMessage ||
    msg?.audioMessage ||
    msg?.documentMessage ||
    msg?.stickerMessage
  );

  const adapter: IBaileysMessageAdapter = {
    id: { id, _serialized: `${fromMe}_${remoteJid}_${id}` },
    from: fromMe ? remoteJid : participant,
    to: fromMe ? remoteJid : undefined,
    body,
    type,
    fromMe,
    hasMedia,
    hasQuotedMsg: hasQuotedMsg(msg),
    isStatus: remoteJid === "status@broadcast",
    timestamp: Number(waMessage.messageTimestamp) || Math.floor(Date.now() / 1000),

    getContact: async (): Promise<IContactAdapter> => {
      const jid = fromMe ? remoteJid : participant;
      try {
        const onWa = await sock.onWhatsApp(jid);
        const contact = Array.isArray(onWa) ? onWa[0] : undefined;
        const profilePic = await sock.profilePictureUrl(jid).catch(() => undefined);
        const name = (contact as any)?.name ?? jidToNumber(jid);
        return {
          id: { user: jidToNumber(jid), _serialized: jid },
          name,
          pushname: name,
          shortName: name,
          isUser: true,
          isWAContact: true,
          isGroup: remoteJid?.endsWith("@g.us") ?? false,
          getProfilePicUrl: async () => profilePic ?? undefined
        };
      } catch {
        return {
          id: { user: jidToNumber(jid), _serialized: jid },
          name: jidToNumber(jid),
          pushname: jidToNumber(jid),
          shortName: jidToNumber(jid),
          isUser: true,
          isWAContact: true,
          isGroup: remoteJid?.endsWith("@g.us") ?? false,
          getProfilePicUrl: async () => undefined
        };
      }
    },

    getChat: async (): Promise<IChatAdapter> => {
      try {
        const name = remoteJid.endsWith("@g.us")
          ? (await sock.groupMetadata(remoteJid).catch(() => null))?.subject ?? remoteJid
          : jidToNumber(remoteJid);
        return {
          id: remoteJid,
          name,
          isGroup: remoteJid.endsWith("@g.us"),
          unreadCount: 0
        };
      } catch {
        return {
          id: remoteJid,
          name: jidToNumber(remoteJid),
          isGroup: remoteJid.endsWith("@g.us"),
          unreadCount: 0
        };
      }
    },

    getQuotedMessage: async (): Promise<IBaileysMessageAdapter | null> => {
      const ext =
        msg?.extendedTextMessage?.contextInfo ??
        msg?.imageMessage?.contextInfo ??
        msg?.videoMessage?.contextInfo ??
        msg?.documentMessage?.contextInfo;
      const quoted = ext?.quotedMessage;
      if (!quoted) return null;
      const quotedKey = ext?.stanzaId ? { ...key, id: ext.stanzaId } : key;
      const quotedWa: WAMessageFull = {
        key: quotedKey,
        message: { conversation: "quoted" },
        messageTimestamp: waMessage.messageTimestamp
      };
      const quotedMsg = ext?.quotedMessage as proto.IMessage;
      const quotedFull: WAMessageFull = {
        ...quotedWa,
        message: quotedMsg
      };
      return buildBaileysMessageAdapter(quotedFull, sock, sessionId);
    },

    downloadMedia: async (): Promise<IMediaData | undefined> => {
      if (!hasMedia) return undefined;
      try {
        const stream = await downloadMediaMessage(waMessage, "buffer", {}, undefined);
        const buffer = Buffer.isBuffer(stream) ? stream : await bufferFromStream(stream);
        let mimetype = "application/octet-stream";
        let filename: string | undefined;
        const m = msg!;
        if (m.imageMessage) {
          mimetype = m.imageMessage.mimetype ?? "image/jpeg";
          filename = m.imageMessage.caption ? undefined : `image.${mimetype.split("/")[1] || "jpg"}`;
        } else if (m.videoMessage) {
          mimetype = m.videoMessage.mimetype ?? "video/mp4";
          filename = m.videoMessage.caption ? undefined : `video.${mimetype.split("/")[1] || "mp4"}`;
        } else if (m.audioMessage) {
          mimetype = m.audioMessage.mimetype ?? "audio/ogg";
          filename = `audio.${mimetype.split("/")[1] || "ogg"}`;
        } else if (m.documentMessage) {
          mimetype = m.documentMessage.mimetype ?? "application/octet-stream";
          filename = m.documentMessage.fileName ?? undefined;
        } else if (m.stickerMessage) {
          mimetype = m.stickerMessage.mimetype ?? "image/webp";
        }
        return { data: buffer, mimetype, filename };
      } catch (err) {
        return undefined;
      }
    }
  };

  return adapter;
}

function bufferFromStream(stream: AsyncIterable<Buffer> | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(stream)) return Promise.resolve(stream);
  const chunks: Buffer[] = [];
  return (async () => {
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  })();
}
