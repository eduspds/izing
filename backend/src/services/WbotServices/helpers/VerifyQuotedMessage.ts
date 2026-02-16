import type { IBaileysMessageAdapter } from "../../../types/baileysAdapter";
import Message from "../../../models/Message";

const VerifyQuotedMessage = async (
  msg: IBaileysMessageAdapter
): Promise<Message | null> => {
  if (!msg.hasQuotedMsg) return null;

  const wbotQuotedMsg = await msg.getQuotedMessage();
  if (!wbotQuotedMsg) return null;

  const quotedMsg = await Message.findOne({
    where: { messageId: wbotQuotedMsg.id.id }
  });

  return quotedMsg ?? null;
};

export default VerifyQuotedMessage;
