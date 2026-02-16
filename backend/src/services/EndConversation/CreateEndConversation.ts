import EndConversation from "../../models/EndConversation";

interface Request {
  message: string;
  userId: number;
  tenantId: number | string;
  canKanban?: boolean;
}

const CreateEndConversationService = async ({
  message,
  userId,
  tenantId,
  canKanban = false
}: Request): Promise<EndConversation> => {
  const endConversationData = await EndConversation.create({
    message,
    userId,
    tenantId,
    canKanban
  });

  return endConversationData;
};

export default CreateEndConversationService;
