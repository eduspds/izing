import { Router } from "express";
import * as InternalChatConfigController from "../controllers/InternalChatConfigController";
import isAuth from "../middleware/isAuth";

const internalChatConfigRoutes = Router();

internalChatConfigRoutes.use(isAuth);

// GET /internal-chat/config - Buscar configurações do chat interno
internalChatConfigRoutes.get("/internal-chat/config", InternalChatConfigController.getConfig);

// PUT /internal-chat/config - Atualizar configurações do chat interno
internalChatConfigRoutes.put("/internal-chat/config", InternalChatConfigController.updateConfig);

export default internalChatConfigRoutes;
