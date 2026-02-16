import AISummary from '../../models/AISummary';
import AppError from '../../errors/AppError';

interface Request {
  ticketId: number;
  tenantId: number;
}

const GetAISummaryService = async ({
  ticketId,
  tenantId
}: Request): Promise<AISummary> => {
  const summary = await AISummary.findOne({
    where: { ticketId, tenantId },
    order: [['createdAt', 'DESC']] // Mais recente primeiro
  });

  if (!summary) {
    throw new AppError("ERR_AI_SUMMARY_NOT_FOUND", 404);
  }

  return summary;
};

export default GetAISummaryService;


