import EndConversation from "../../models/EndConversation";

interface Request {
  tenantId: number | string;
  endConversationId: number | string;
}

const ListOneEndConversationService = async ({
  tenantId,
  endConversationId
}: Request): Promise<EndConversation | null> => {
  const endConversationData = await EndConversation.findOne({
    where: { tenantId, id: endConversationId },
    attributes: ["id", "message", "userId", "canKanban"],
    order: [["createdAt", "DESC"]]
  });

  return endConversationData;
};

export default ListOneEndConversationService;
