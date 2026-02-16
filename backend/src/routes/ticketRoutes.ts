import express from "express";
import isAuth from "../middleware/isAuth";

import * as TicketController from "../controllers/TicketController";

const ticketRoutes = express.Router();

ticketRoutes.get("/tickets", isAuth, TicketController.index);

// Rota do relatório deve vir ANTES das rotas dinâmicas para evitar conflito
ticketRoutes.get("/tickets-report", isAuth, TicketController.report);

ticketRoutes.get("/tickets/:ticketId", isAuth, TicketController.show);

ticketRoutes.post("/tickets", isAuth, TicketController.store);

ticketRoutes.put("/tickets/:ticketId", isAuth, TicketController.update);

ticketRoutes.delete("/tickets/:ticketId", isAuth, TicketController.remove);

ticketRoutes.get(
  "/tickets/:ticketId/logs",
  isAuth,
  TicketController.showLogsTicket
);

ticketRoutes.post(
  "/tickets/:ticketId/activate-confidential",
  isAuth,
  TicketController.activateConfidential
);

ticketRoutes.post(
  "/tickets/:ticketId/deactivate-confidential",
  isAuth,
  TicketController.deactivateConfidential
);

ticketRoutes.post(
  "/tickets/:ticketId/show-confidential",
  isAuth,
  TicketController.showConfidential
);

export default ticketRoutes;
