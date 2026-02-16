import EndConversation from "../../models/EndConversation";

interface Request {
  tenantId: number | string;
}

const ListEndConversationService = async ({
  tenantId
}: Request): Promise<EndConversation[]> => {
  const endConversationData = await EndConversation.findAll({
    where: { tenantId },
    attributes: ["id", "message", "userId", "canKanban"],
    order: [["createdAt", "DESC"]]
  });

  return endConversationData;
};
export default ListEndConversationService;
