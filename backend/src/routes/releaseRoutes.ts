import express from "express";
import isAuthAdmin from "../middleware/isAuthAdmin";
import isAuth from "../middleware/isAuth";
import isAuthOptional from "../middleware/isAuthOptional";
import * as ReleaseController from "../controllers/ReleaseController";

const releaseRoutes = express.Router();

// Rotas públicas (autenticação opcional - permite verificar se usuário já viu, mas funciona sem token)
releaseRoutes.get("/public/latest-release", isAuthOptional, ReleaseController.latest);

// Rotas autenticadas (para marcar versão como vista)
releaseRoutes.post(
  "/public/mark-version-seen",
  isAuth,
  ReleaseController.markVersionAsSeen
);

// Rotas públicas (todos os usuários autenticados podem ver)
releaseRoutes.get("/public/releases", isAuth, ReleaseController.index);
releaseRoutes.get("/public/releases/:id", isAuth, ReleaseController.show);

// Rotas administrativas (apenas leitura - read-only) - mantidas para compatibilidade
releaseRoutes.get("/admin/releases", isAuthAdmin, ReleaseController.index);
releaseRoutes.get("/admin/releases/:id", isAuthAdmin, ReleaseController.show);

export default releaseRoutes;
