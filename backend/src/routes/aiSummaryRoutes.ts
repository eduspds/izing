import { Router } from "express";
import * as AISummaryController from "../controllers/AISummaryController";
import isAuth from "../middleware/isAuth";

const aiSummaryRoutes = Router();

// Middleware de autenticação
aiSummaryRoutes.use(isAuth);

// Gerar resumo de IA
aiSummaryRoutes.post("/ai-summary/:ticketId/generate", AISummaryController.generateAISummary);

// Buscar resumo existente
aiSummaryRoutes.get("/ai-summary/:ticketId", AISummaryController.getAISummary);

export default aiSummaryRoutes;
