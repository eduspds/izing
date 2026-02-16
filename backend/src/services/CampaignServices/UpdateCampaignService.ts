import { setMinutes, setHours, parseISO } from "date-fns";
import { Sequelize } from "sequelize-typescript";
import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import Contact from "../../models/Contact";
import CampaignContacts from "../../models/CampaignContacts";
import { logger } from "../../utils/logger";
import { normalizeBrazilianNumber } from "../../helpers/NormalizeBrazilianNumber";

const cArquivoName = (url: string | undefined) => {
  if (!url) return "";
  const split = url.split("/");
  const name = split[split.length - 1];
  return name;
};
interface CampaignData {
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
  customVariables?: string;
  variablesData?: string;
  contactsData?: string;
}

interface Request {
  campaignData: CampaignData;
  medias?: Express.Multer.File[];
  campaignId: string | number;
  tenantId: string | number;
}

const UpdateCampaignService = async ({
  campaignData,
  medias,
  campaignId,
  tenantId
}: Request): Promise<Campaign> => {
  let mediaData: Express.Multer.File | undefined;
  let data: any = {
    ...campaignData,
    mediaUrl: cArquivoName(campaignData.mediaUrl),
    start: setHours(setMinutes(parseISO(campaignData.start), 0), 8)
  };

  const campaignModel = await Campaign.findOne({
    where: { id: campaignId, tenantId }
  });

  if (
    campaignModel?.status !== "pending" &&
    campaignModel?.status !== "canceled"
  ) {
    throw new AppError("ERR_NO_UPDATE_CAMPAIGN_NOT_IN_CANCELED_PENDING", 404);
  }

  if (medias && Array.isArray(medias) && medias.length) {
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
    data = {
      ...campaignData,
      mediaUrl: mediaData?.filename,
      mediaType: mediaData?.mimetype.substr(0, mediaData.mimetype.indexOf("/"))
    };
  } else if (campaignData.mediaUrl === "null") {
    data = {
      ...campaignData,
      mediaUrl: "",
      mediaType: ""
    };
  }

  if (!campaignModel) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  // Processar variáveis personalizadas (se enviadas)
  if (campaignData.customVariables) {
    try {
      let parsedCustomVars = campaignData.customVariables;

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

      data.customVariables = parsedCustomVars;
      logger.info(
        `UpdateCampaign - customVariables parsed successfully (${
          Array.isArray(parsedCustomVars) ? parsedCustomVars.length : 0
        } items)`
      );
    } catch (error) {
      logger.error("Error parsing customVariables:", error);
      logger.error("Raw customVariables value:", campaignData.customVariables);
    }
  }

  if (campaignData.variablesData) {
    try {
      let parsedVarsData = campaignData.variablesData;

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

      data.variablesData = parsedVarsData;
      logger.info(
        `UpdateCampaign - variablesData parsed successfully (${
          Array.isArray(parsedVarsData) ? parsedVarsData.length : 0
        } items)`
      );
    } catch (error) {
      logger.error("Error parsing variablesData:", error);
      logger.error("Raw variablesData value:", campaignData.variablesData);
    }
  }

  await campaignModel.update(data);

  // NOVO: Processar contatos se foram enviados (adiciona aos existentes)
  if (campaignData.contactsData) {
    try {
      const contactsData = JSON.parse(campaignData.contactsData);

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
              tenantId
            }
          });

          if (!contact) {
            contact = await Contact.create({
              name: name || number,
              number: normalizedNumber,
              tenantId,
              email: ""
            });
          }

          contactsToAdd.push({
            campaignId: campaignModel.id,
            contactId: contact.id,
            messageRandom: "message1",
            ack: 0,
            body: "",
            timestamp: null
          });
        }

        // Adicionar contatos à campanha (ignora duplicados)
        if (contactsToAdd.length > 0) {
          await CampaignContacts.bulkCreate(contactsToAdd, {
            ignoreDuplicates: true
          });

          logger.info(
            `${contactsToAdd.length} contatos adicionados/atualizados na campanha ${campaignModel.id}`
          );
        }
      }
    } catch (error) {
      logger.error("Error processing contactsData:", error);
    }
  }

  // Buscar campanha novamente com contactsCount para retornar
  const campaignWithCount = await Campaign.findOne({
    where: { id: campaignModel.id },
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

  return campaignWithCount || campaignModel;
};

export default UpdateCampaignService;
