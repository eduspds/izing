import EndConversation from "../../models/EndConversation";

interface Request {
  endConversationId: string;
  tenantId: number | string;
}

const DeleteEndConversationService = async ({
  endConversationId,
  tenantId
}: Request): Promise<void> => {
  const endConversation = await EndConversation.findOne({
    where: { id: endConversationId, tenantId }
  });

  if (!endConversation) {
    throw new Error("ERR_NO_END_CONVERSATION_FOUND");
  }

  await endConversation.destroy();
};
export default DeleteEndConversationService;
