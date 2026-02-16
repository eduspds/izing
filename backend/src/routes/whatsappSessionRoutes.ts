import { Router } from "express";
import isAuth from "../middleware/isAuth";

import WhatsAppSessionController from "../controllers/WhatsAppSessionController";
import WhatsAppReconnectController from "../controllers/WhatsAppReconnectController";

const whatsappSessionRoutes = Router();

whatsappSessionRoutes.post(
  "/whatsappsession/:whatsappId",
  isAuth,
  WhatsAppSessionController.store
);

whatsappSessionRoutes.put(
  "/whatsappsession/:whatsappId",
  isAuth,
  WhatsAppSessionController.update
);

whatsappSessionRoutes.delete(
  "/whatsappsession/:whatsappId",
  isAuth,
  WhatsAppSessionController.remove
);

whatsappSessionRoutes.post(
  "/whatsappsession/:whatsappId/reconnect",
  isAuth,
  WhatsAppReconnectController.reconnect
);

export default whatsappSessionRoutes;
