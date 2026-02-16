import Message from "../../models/Message";

const isMessageExistsService = async (msg: { id?: { id?: string } }): Promise<boolean> => {
  const messageId = msg?.id?.id;
  if (!messageId) return false;
  const message = await Message.findOne({
    where: { messageId }
  });
  if (!message) {
    console.log("Mensagem não existe", messageId);
    return false;
  }
  console.log("Mensagem existente", messageId);
  return true;
};

export default isMessageExistsService;
