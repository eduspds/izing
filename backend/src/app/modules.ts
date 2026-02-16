import { readFileSync } from "fs";
import moment from "moment";
import expressInstance, { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import routes from "../routes";
import uploadConfig from "../config/upload";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";

export default async function modules(app): Promise<void> {
  const { version } = JSON.parse(readFileSync("./package.json").toString());
  const started = new Date();
  const { env } = process;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    serverName: env.BACKEND_URL,
    release: version
  });

  app.get("/health", async (req, res) => {
    let checkConnection;
    try {
      checkConnection = "Servidor disponível!";
    } catch (e) {
      checkConnection = `Servidor indisponível! ${e}`;
    }
    res.json({
      started: moment(started).format("DD/MM/YYYY HH:mm:ss"),
      currentVersion: version,
      uptime: (Date.now() - Number(started)) / 1000,
      statusService: checkConnection
    });
  });

  app.use(Sentry.Handlers.requestHandler());

  // Middleware para garantir MIME types e CORS corretos para arquivos públicos
  app.use("/public", (req, res, next) => {
    // ✅ CORREÇÃO CORS: Não usar '*' quando credentials: true
    // Usar a mesma lógica do express.ts para permitir origins específicos
    const frontendUrl = process.env.FRONTEND_URL;
    const { origin } = req.headers;

    // Se houver origin e FRONTEND_URL configurado, verificar se é permitido
    if (origin && frontendUrl && frontendUrl !== "*") {
      const allowedOrigins = frontendUrl.split(",").map(url => url.trim());
      if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      } else {
        // Se não estiver na lista, usar o primeiro permitido (fallback)
        const fallbackOrigin = allowedOrigins[0] || origin;
        res.setHeader("Access-Control-Allow-Origin", fallbackOrigin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
    } else if (origin) {
      // Se houver origin mas não houver FRONTEND_URL configurado, usar o origin da requisição
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else if (process.env.NODE_ENV === "dev") {
      // Se não houver origin (ex: requisições de mesma origem), usar '*' apenas em dev
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    );
    res.setHeader("Access-Control-Expose-Headers", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
    res.setHeader("Cache-Control", "public, max-age=31536000");

    // Responder OPTIONS rapidamente
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    const ext = req.path.toLowerCase().split(".").pop();

    // Definir Content-Type correto baseado na extensão
    const mimeTypes = {
      mp3: "audio/mpeg",
      mpeg: "audio/mpeg",
      ogg: "audio/ogg",
      oga: "audio/ogg",
      opus: "audio/ogg",
      webm: "audio/webm",
      wav: "audio/wav",
      m4a: "audio/mp4",
      aac: "audio/aac"
    };

    if (mimeTypes[ext]) {
      res.setHeader("Content-Type", mimeTypes[ext]);
    }

    return next();
  });

  app.use("/public", expressInstance.static(uploadConfig.directory));

  app.use(routes);
  app.use(Sentry.Handlers.errorHandler());

  // ✅ CORREÇÃO: Middleware de erro melhorado
  app.use(
    async (err: Error, req: Request, res: Response, next: NextFunction) => {
      // ✅ VERIFICAR SE A RESPOSTA JÁ FOI ENVIADA
      if (res.headersSent) {
        logger.warn("Headers já enviados, ignorando middleware de erro");
        return next(err);
      }

      try {
        if (err instanceof AppError) {
          if (err.statusCode === 403) {
            logger.warn(err);
          } else {
            logger.error(err);
          }
          return res.status(err.statusCode).json({ error: err.message });
        }

        logger.error(err);

        // ✅ GARANTIR QUE SÓ UMA RESPOSTA SEJA ENVIADA
        return res.status(500).json({
          error: "Internal server error",
          // ⚠️ Remover detalhes do erro em produção para segurança
          ...(process.env.NODE_ENV === "development" && {
            details: err.message
          })
        });
      } catch (error) {
        logger.error("Erro no middleware de erro:", error);
        // ✅ EM CASO DE ERRO NO MIDDLEWARE, CHAMAR NEXT
        return next(err);
      }
    }
  );

  logger.info("modules routes already in server!");
}
