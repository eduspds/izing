import nodemailer from "nodemailer";
import { logger } from "../utils/logger";

export interface MailConfig {
  from?: string;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  secure?: boolean;
}

const defaultTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.MAIL_PORT) || 587,
  secure: process.env.MAIL_SECURE === "true",
  auth: process.env.MAIL_USER
    ? {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    : undefined
});

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  config?: MailConfig;
}

export const sendMail = async ({
  to,
  subject,
  html,
  text,
  config
}: SendMailOptions): Promise<boolean> => {
  try {
    const user = config?.user ?? process.env.MAIL_USER;
    if (!user) {
      logger.warn("[MAIL] E-mail não configurado (remetente) - configure em Configurações > E-mail ou .env");
      return false;
    }
    const from = config?.from ?? process.env.MAIL_FROM ?? process.env.MAIL_USER ?? user;
    if (config?.host && config?.user) {
      const transporter = nodemailer.createTransport({
        host: config.host || "smtp.gmail.com",
        port: config.port || 587,
        secure: config.secure === true,
        auth: {
          user: config.user,
          pass: config.pass || ""
        }
      });
      await transporter.sendMail({ from, to, subject, html, text: text || undefined });
    } else {
      await defaultTransporter.sendMail({ from, to, subject, html, text: text || undefined });
    }
    return true;
  } catch (err) {
    logger.error("[MAIL] Erro ao enviar e-mail:", err);
    return false;
  }
};

export const buildInviteEmailHtml = (inviteLink: string, appName: string = "Izing"): string => {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; padding: 20px; max-width: 500px;">
  <p>Olá!</p>
  <p>Você foi convidado para acessar o sistema <strong>${appName}</strong>.</p>
  <p>Clique no link abaixo para definir seu nome e senha (o link expira em 24 horas):</p>
  <p><a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background: #1976d2; color: #fff; text-decoration: none; border-radius: 8px;">Aceitar convite</a></p>
  <p>Ou copie e cole no navegador:</p>
  <p style="word-break: break-all; color: #666;">${inviteLink}</p>
  <p style="color: #999; font-size: 12px;">Se você não solicitou este convite, ignore este e-mail.</p>
</body>
</html>`;
};
