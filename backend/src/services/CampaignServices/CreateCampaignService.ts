// import AppError from "../../errors/AppError";
import { parseISO } from "date-fns";
import { Sequelize } from "sequelize-typescript";
import { logger } from "../../utils/logger";

import Campaign from "../../models/Campaign";
import Contact from "../../models/Contact";
import CampaignContacts from "../../models/CampaignContacts";
import { normalizeBrazilianNumber } from "../../helpers/NormalizeBrazilianNumber";

interface CampaignRequest {
  name: string;
  start: string;
  message1: string;
  message2?: string;
  message3?: string;
  mediaUrl?: string;
  mediaType?: string;
  userId: string;
  delay: string;
  sessionId: string;
  tenantId: string;
  customVariables?: string; // JSON string com variáveis personalizadas
  variablesData?: string; // JSON string com dados das variáveis
  contactsData?: string; // JSON string com contatos para criar/adicionar
}

interface Request {
  campaign: CampaignRequest;
  medias?: Express.Multer.File[];
}

const CreateCampaignService = async ({
  campaign,
  medias
}: Request): Promise<Campaign> => {
  let mediaData: Express.Multer.File | undefined;
  if (medias) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File) => {
        try {
          if (!media.filename) {
            const ext = media.mimetype.split("/")[1].split(";")[0];
            media.filename = `${new Date().getTime()}.${ext}`;
          }
          mediaData = media;
        } catch (err) {
          logger.error(err);
        }
      })
    );
  }

  // Processar variáveis personalizadas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let customVariables: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let variablesData: any = null;

  if (campaign.customVariables) {
    try {
      let parsedCustomVars = campaign.customVariables;

      // Se for string, fazer parse
      if (typeof parsedCustomVars === "string") {
        parsedCustomVars = JSON.parse(parsedCustomVars);
      }

      // Se vier como array de strings (problema do FormData), pegar o último elemento válido
      if (Array.isArray(parsedCustomVars) && parsedCustomVars.length > 0) {
        if (typeof parsedCustomVars[0] === "string") {
          // Tentar pegar o último elemento que parece ser JSON válido
          for (let i = parsedCustomVars.length - 1; i >= 0; i--) {
            try {
              if (
                parsedCustomVars[i].startsWith("[") ||
                parsedCustomVars[i].startsWith("{")
              ) {
                parsedCustomVars = JSON.parse(parsedCustomVars[i]);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
      }

      customVariables = parsedCustomVars;
      logger.info(
        `CreateCampaign - customVariables parsed successfully (${
          Array.isArray(parsedCustomVars) ? parsedCustomVars.length : 0
        } items)`
      );
    } catch (error) {
      logger.error("Error parsing customVariables:", error);
      logger.error("Raw customVariables value:", campaign.customVariables);
    }
  }

  if (campaign.variablesData) {
    try {
      let parsedVarsData = campaign.variablesData;

      // Se for string, fazer parse
      if (typeof parsedVarsData === "string") {
        parsedVarsData = JSON.parse(parsedVarsData);
      }

      // Se vier como array de strings (problema do FormData), pegar o último elemento válido
      if (Array.isArray(parsedVarsData) && parsedVarsData.length > 0) {
        if (typeof parsedVarsData[0] === "string") {
          // Tentar pegar o último elemento que parece ser JSON válido
          for (let i = parsedVarsData.length - 1; i >= 0; i--) {
            try {
              if (
                parsedVarsData[i].startsWith("[") ||
                parsedVarsData[i].startsWith("{")
              ) {
                parsedVarsData = JSON.parse(parsedVarsData[i]);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
      }

      variablesData = parsedVarsData;
      logger.info(
        `CreateCampaign - variablesData parsed successfully (${
          Array.isArray(parsedVarsData) ? parsedVarsData.length : 0
        } items)`
      );
    } catch (error) {
      logger.error("Error parsing variablesData:", error);
      logger.error("Raw variablesData value:", campaign.variablesData);
    }
  }

  const data: any = {
    name: campaign.name,
    start: parseISO(campaign.start),
    message1: campaign.message1,
    message2: campaign.message2 || "",
    message3: campaign.message3 || "",
    userId: campaign.userId,
    delay: campaign.delay,
    mediaUrl: mediaData?.filename,
    mediaType: mediaData?.mimetype.substr(0, mediaData.mimetype.indexOf("/")),
    sessionId: campaign.sessionId,
    tenantId: campaign.tenantId,
    customVariables,
    variablesData
  };
  const campaignData = await Campaign.create(data);

  // NOVO: Processar contatos se foram enviados junto com a campanha
  if (campaign.contactsData) {
    try {
      const contactsData = JSON.parse(campaign.contactsData);

      if (Array.isArray(contactsData) && contactsData.length > 0) {
        const contactsToAdd: Array<{
          campaignId: number;
          contactId: number;
          messageRandom: string;
          ack: number;
          body: string;
          timestamp: number | null;
        }> = [];

        for (const contactInfo of contactsData) {
          const { name, number } = contactInfo;

          if (!number) continue;

          // Normalizar número brasileiro (remove 9º dígito)
          const normalizedNumber = normalizeBrazilianNumber(number);

          // Buscar ou criar contato
          let contact = await Contact.findOne({
            where: {
              number: normalizedNumber,
              tenantId: campaign.tenantId
            }
          });

          if (!contact) {
            contact = await Contact.create({
              name: name || number,
              number: normalizedNumber,
              tenantId: campaign.tenantId,
              email: ""
            });
          }

          contactsToAdd.push({
            campaignId: campaignData.id,
            contactId: contact.id,
            messageRandom: "message1",
            ack: 0,
            body: "",
            timestamp: null
          });
        }

        // Adicionar contatos à campanha
        if (contactsToAdd.length > 0) {
          await CampaignContacts.bulkCreate(contactsToAdd, {
            ignoreDuplicates: true
          });

          logger.info(
            `${contactsToAdd.length} contatos adicionados à campanha ${campaignData.id}`
          );
        }
      }
    } catch (error) {
      logger.error("Error processing contactsData:", error);
    }
  }

  // Buscar campanha novamente com contactsCount para retornar
  const campaignWithCount = await Campaign.findOne({
    where: { id: campaignData.id },
    attributes: {
      include: [
        [
          Sequelize.fn("COUNT", Sequelize.col("campaignContacts.id")),
          "contactsCount"
        ]
      ]
    },
    include: [
      {
        model: CampaignContacts,
        attributes: []
      }
    ],
    group: ["Campaign.id"]
  });

  return campaignWithCount || campaignData;
};

export default CreateCampaignService;
