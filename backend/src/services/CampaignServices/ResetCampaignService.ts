import { Sequelize } from "sequelize-typescript";
import Campaign from "../../models/Campaign";
import CampaignContacts from "../../models/CampaignContacts";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

interface Request {
  campaignId: string | number;
  tenantId: number | string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ResetCampaignService = async ({
  campaignId,
  tenantId
}: Request): Promise<any> => {
  const campaign = await Campaign.findOne({
    where: { id: campaignId, tenantId }
  });

  if (!campaign) {
    throw new AppError("ERROR_CAMPAIGN_NOT_EXISTS", 404);
  }

  // Apenas campanhas finalizadas podem ser resetadas
  if (campaign.status !== "finished") {
    throw new AppError("CAMPAIGN_NOT_FINISHED", 400);
  }

  // Buscar contatos antes de resetar (para retornar ao frontend)
  const contacts = await Contact.findAll({
    where: {
      tenantId
    },
    include: [
      {
        model: CampaignContacts,
        as: "campaignContacts",
        where: { campaignId },
        required: true
      }
    ],
    order: [["name", "ASC"]]
  });

  // Resetar status dos contatos da campanha
  await CampaignContacts.update(
    {
      body: null,
      mediaName: null,
      timestamp: null,
      ack: 0,
      messageId: null
    },
    {
      where: {
        campaignId: campaign.id
      }
    }
  );

  // Atualizar status da campanha para pendente
  await campaign.update({
    status: "pending"
  });

  // Buscar campanha atualizada com contagem e incluir campos JSONB
  const campaignWithCount = await Campaign.findOne({
    where: { id: campaign.id },
    attributes: [
      "id",
      "name",
      "start",
      "status",
      "message1",
      "message2",
      "message3",
      "mediaUrl",
      "mediaType",
      "userId",
      "sessionId",
      "tenantId",
      "delay",
      "customVariables",
      "variablesData",
      "createdAt",
      "updatedAt",
      [
        Sequelize.fn("COUNT", Sequelize.col("campaignContacts.id")),
        "contactsCount"
      ]
    ],
    include: [
      {
        model: CampaignContacts,
        attributes: []
      }
    ],
    group: ["Campaign.id"]
  });

  logger.info(
    `Campanha resetada | campaignId=${campaignId} | Status: finished -> pending | ${
      contacts.length
    } contatos mantidos | Variáveis: ${
      campaign.customVariables ? "SIM" : "NÃO"
    }`
  );

  // Serializar campanha para garantir que campos JSONB sejam incluídos
  const campaignData = campaignWithCount || campaign;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedCampaign = campaignData.toJSON() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedContacts = contacts.map(c => c.toJSON()) as any[];

  return {
    campaign: serializedCampaign,
    contacts: serializedContacts
  };
};

export default ResetCampaignService;
