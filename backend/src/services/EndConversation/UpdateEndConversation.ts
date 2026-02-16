import EndConversation from "../../models/EndConversation";
import AppError from "../../errors/AppError";

interface EndConversationData {
  message: string;
  userId: number;
  tenantId: number | string;
  canKanban: boolean;
}

interface Request {
  endConversationData: EndConversationData;
  endConversationId: string;
}

const UpdateEndConversationService = async ({
  endConversationData,
  endConversationId
}: Request): Promise<EndConversation> => {
  const { message, userId, tenantId, canKanban } = endConversationData;

  const endConversationModel = await EndConversation.findOne({
    where: { id: endConversationId, tenantId },
    attributes: ["id", "message", "userId", "canKanban"]
  });

  if (!endConversationModel) {
    throw new AppError("ERR_NO_END_CONVERSATION_FOUND", 404);
  }

  await endConversationModel.update({
    message,
    userId,
    canKanban
  });

  await endConversationModel.reload({
    attributes: ["id", "message", "userId", "canKanban"]
  });

  return endConversationModel;
};
export default UpdateEndConversationService;
