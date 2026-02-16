/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
import "reflect-metadata";
import "express-async-errors";
import "./config-env";
import { createServer } from "http";
import { env } from "process";
import express from "express";
import GracefulShutdown from "http-graceful-shutdown";
import bootstrap from "./boot";
import { initIO } from "../libs/socket";
import { StartAllWhatsAppsSessions } from "../services/WbotServices/StartAllWhatsAppsSessions";
import whatsAppManager from "../libs/wbot";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async function application() {
  const app: any = express();
  const httpServer: any = createServer(app);
  const port = app.get("port") || env.PORT || 3100;

  await bootstrap(app);

  async function start() {
    const host = app.get("host") || "0.0.0.0";
    app.server = httpServer.listen(port, host, async () => {
      console.info(`🌐 Web server listening at: http://${host}:${port}/`);
    });

    initIO(app.server);

    // needs to start after socket is available
    await StartAllWhatsAppsSessions();

    // CONFIGURACAO DO GRACEFUL SHUTDOWN
    GracefulShutdown(app.server, {
      development: env.NODE_ENV !== "production",
      onShutdown: async signal => {
        console.log(`Recebido ${signal}, encerrando conexões WhatsApp...`);
        await whatsAppManager.shutdown();
      },
      finally: () => {
        console.log("Servidor fechado com sucesso");
      }
    });
  }

  async function close() {
    console.log("Iniciando shutdown graceful...");

    // Desconectar WhatsApp antes de fechar
    await whatsAppManager.shutdown();

    return new Promise<void>((resolve, reject) => {
      httpServer.close(err => {
        if (err) {
          console.error("Erro ao fechar servidor:", err);
          reject(err);
        } else {
          console.log("Servidor fechado com sucesso");
          resolve();
        }
      });
    });
  }

  process.on("SIGTERM", close);
  process.on("SIGINT", close);

  app.start = start;
  app.close = close;

  return app;
}
