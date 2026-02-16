import "reflect-metadata";
import "express-async-errors";
import { Application, json, urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { logger } from "../utils/logger";

export default async function express(app: Application): Promise<void> {
  // Quando credentials: true, precisamos especificar o origin ou usar uma função
  const frontendUrl = process.env.FRONTEND_URL;
  app.use(
    cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
        // Se não houver origin (ex: requisições de mesma origem ou mobile apps), permitir
        if (!origin) {
          return callback(null, true);
        }
        
        // Se não houver FRONTEND_URL configurado, permitir qualquer origin (apenas em dev)
        if (!frontendUrl || frontendUrl === "*") {
          if (process.env.NODE_ENV === "dev") {
            return callback(null, true);
          }
          // Em produção, sem FRONTEND_URL, negar
          return callback(new Error("CORS: FRONTEND_URL não configurado"));
        }
        
        // Verificar se o origin é permitido
        const allowedOrigins = frontendUrl.split(",").map(url => url.trim());
        if (allowedOrigins.includes(origin)) {
          return callback(null, origin);
        }
        
        // Se o origin não estiver na lista, usar o primeiro permitido (fallback)
        // Isso permite que requisições de outros domínios sejam redirecionadas
        return callback(null, allowedOrigins[0] || origin);
      },
      credentials: true,
      exposedHeaders: ["*"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin"
      ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
    })
  );

  if (process.env.NODE_ENV !== "dev") {
    app.use(helmet());
    // Sets all of the defaults, but overrides script-src
    app.use(
      helmet.contentSecurityPolicy({
        directives: {
          "default-src": ["'self'"],
          "base-uri": ["'self'"],
          "block-all-mixed-content": [],
          "font-src": ["'self'", "https:", "data:"],
          "img-src": ["'self'", "data:"],
          "object-src": ["'none'"],
          "script-src-attr": ["'none'"],
          "style-src": ["'self'", "https:", "'unsafe-inline'"],
          "upgrade-insecure-requests": [],
          // ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          scriptSrc: [
            "'self'",
            `*${process.env.FRONTEND_URL || "localhost: 3101"}`
            // "localhost"
          ],
          frameAncestors: [
            "'self'",
            `* ${process.env.FRONTEND_URL || "localhost: 3101"}`
          ]
        }
      })
    );
    app.use(
      helmet({
        crossOriginResourcePolicy: false, // Desabilitar para permitir mídia cross-origin
        crossOriginEmbedderPolicy: false
      } as any)
    );
  }

  console.info("cors domain ======>>>>", process.env.FRONTEND_URL);

  app.use(cookieParser());
  app.use(json({ limit: "100MB" }));
  app.use(
    urlencoded({ extended: true, limit: "100MB", parameterLimit: 200000 })
  );

  logger.info("express already in server!");
}
