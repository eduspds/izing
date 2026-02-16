import express from "express";
import isAuth from "../middleware/isAuth";

import * as TicketKanbanController from "../controllers/TicketKanban";

const ticketKanbanRoutes = express.Router();

ticketKanbanRoutes.post(
  "/ticket-kanbans",
  isAuth,
  TicketKanbanController.createTicketKanban
);

ticketKanbanRoutes.get(
  "/ticket-kanbans",
  isAuth,
  TicketKanbanController.findAllTicketKanban
);

ticketKanbanRoutes.get(
  "/ticket-kanbans/:ticketKanbanId",
  isAuth,
  TicketKanbanController.findOneTicketKanban
);

ticketKanbanRoutes.put(
  "/ticket-kanbans/:ticketKanbanId",
  isAuth,
  TicketKanbanController.updateTicketKanban
);

ticketKanbanRoutes.patch(
  "/ticket-kanbans/:ticketKanbanId/status",
  isAuth,
  TicketKanbanController.updateStatusTicketKanban
);

ticketKanbanRoutes.delete(
  "/ticket-kanbans/:ticketKanbanId",
  isAuth,
  TicketKanbanController.deleteTicketKanban
);

export default ticketKanbanRoutes;
