import { Request, Response } from "express";
import GenerateAISummaryService from "../services/AISummaryServices/GenerateAISummaryService";
import GetAISummaryService from "../services/AISummaryServices/GetAISummaryService";

export const generateAISummary = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { messages } = req.body;
  const { tenantId } = req.user;

  console.log('🤖 Gerando resumo para ticket:', ticketId);
  console.log('🤖 Mensagens recebidas:', messages?.length || 0);
  console.log('🤖 Tenant ID:', tenantId);

  try {
    const summary = await GenerateAISummaryService({
      ticketId: Number(ticketId),
      messages,
      tenantId: Number(tenantId)
    });

    console.log('✅ Resumo gerado com sucesso:', summary.id);
    return res.status(200).json({
      summary
    });
  } catch (error) {
    console.error("❌ Erro ao gerar resumo de IA:", error);
    return res.status(400).json({ error: error.message });
  }
};

export const getAISummary = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { tenantId } = req.user;

  try {
    const summary = await GetAISummaryService({
      ticketId: Number(ticketId),
      tenantId: Number(tenantId)
    });

    return res.status(200).json({
      summary
    });
  } catch (error) {
    console.error("Erro ao buscar resumo de IA:", error);
    return res.status(404).json({ error: error.message });
  }
};
