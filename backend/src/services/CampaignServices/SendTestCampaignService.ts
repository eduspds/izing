import { join } from "path";
import { readFile } from "fs/promises";
import Campaign from "../../models/Campaign";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import { getWbot } from "../../libs/wbot";
import { toBaileysJid } from "../../types/baileysAdapter";
import { logger } from "../../utils/logger";
import { normalizeBrazilianNumber } from "../../helpers/NormalizeBrazilianNumber";

interface Request {
  campaignId: string | number;
  testNumber: string;
  tenantId: string | number;
}

const cArquivoName = (url: string | null) => {
  if (!url) return "";
  const split = url.split("/");
  return split[split.length - 1] ?? "";
};

const SendTestCampaignService = async ({
  campaignId,
  testNumber,
  tenantId
}: Request): Promise<void> => {
  const campaign = await Campaign.findOne({
    where: { id: campaignId, tenantId }
  });

  if (!campaign) throw new AppError("ERROR_CAMPAIGN_NOT_EXISTS", 404);

  const normalizedNumber = normalizeBrazilianNumber(testNumber);

  let contact = await Contact.findOne({
    where: { number: normalizedNumber, tenantId }
  });
  if (!contact) {
    contact = await Contact.create({
      name: `Teste - ${normalizedNumber}`,
      number: normalizedNumber,
      tenantId,
      email: ""
    });
  }

  let bodyMessage = "";
  if (campaign.message1) bodyMessage = campaign.message1;
  else if (campaign.message2) bodyMessage = campaign.message2;
  else if (campaign.message3) bodyMessage = campaign.message3;
  else throw new AppError("CAMPAIGN_HAS_NO_MESSAGE", 400);

  if (campaign.customVariables && campaign.variablesData) {
    bodyMessage = `📋 TESTE DE CAMPANHA (variáveis não são substituídas no teste)\n\n${bodyMessage}`;
  }

  try {
    const wbot = getWbot(campaign.sessionId);
    const jid = toBaileysJid(normalizedNumber, false);

    if (campaign.mediaUrl) {
      const customPath = join(__dirname, "..", "..", "..", "public");
      const mediaPath = join(customPath, cArquivoName(campaign.mediaUrl));
      const buffer = await readFile(mediaPath);
      await wbot.sock.sendMessage(jid, {
        image: buffer,
        caption: bodyMessage
      });
    } else {
      await wbot.sock.sendMessage(jid, { text: bodyMessage });
    }

    logger.info(
      `Mensagem de teste enviada | campaignId=${campaignId} number=${normalizedNumber}`
    );
  } catch (error: any) {
    logger.error("Erro ao enviar mensagem de teste:", error);
    throw new AppError(
      `Erro ao enviar mensagem de teste: ${error?.message || error}`,
      500
    );
  }
};

export default SendTestCampaignService;
