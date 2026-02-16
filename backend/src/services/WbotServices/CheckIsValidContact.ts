import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import { toBaileysJid } from "../../types/baileysAdapter";
import { logger } from "../../utils/logger";
import { StartWhatsAppSessionVerify } from "./StartWhatsAppSessionVerify";

const CheckIsValidContact = async (
  number: string,
  tenantId: string | number
): Promise<any> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(tenantId);
  const wbot = getWbot(defaultWhatsapp.id);
  const jid = toBaileysJid(number, false);

  try {
    const onWa = await wbot.sock.onWhatsApp(jid);
    const wa = Array.isArray(onWa) ? onWa[0] : undefined;
    if (!wa) throw new AppError("invalidNumber", 400);
    return { _serialized: jid, ...wa };
  } catch (err: any) {
    logger.error(`CheckIsValidContact | Error: ${err}`);
    await StartWhatsAppSessionVerify(defaultWhatsapp.id, err);
    if (err.message === "invalidNumber") throw new AppError("ERR_WAPP_INVALID_CONTACT");
    throw new AppError("ERR_WAPP_CHECK_CONTACT");
  }
};

export default CheckIsValidContact;
