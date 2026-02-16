import { logger } from "../utils/logger";
import Campaign from "../models/Campaign";
import CampaignContacts from "../models/CampaignContacts";
import { normalizeBrazilianNumber } from "./NormalizeBrazilianNumber";

interface Request {
  campaign: Campaign;
  campaignContact: CampaignContacts;
}

/**
 * Substitui variáveis personalizadas na mensagem da campanha
 * Suporta:
 * - {{name}} - Nome do contato (padrão)
 * - {{variavel}} - Qualquer variável customizada importada via XLSX
 */
const SetPersonalMessage = ({
  campaign,
  campaignContact
}: Request): string => {
  let message = campaign.message1 || "";

  try {
    // 1. Substituir {{name}} pelo nome do contato
    if (message.includes("{{name}}")) {
      const contactName = campaignContact.contact?.name || "";
      message = message.replace(/\{\{name\}\}/g, contactName);
    }

    // 2. Se não tiver variáveis customizadas, retornar a mensagem como está
    if (!campaign.customVariables || !campaign.variablesData) {
      return message;
    }

    // 3. Parse seguro das variáveis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let customVars: any = campaign.customVariables;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let varsData: any = campaign.variablesData;

    // Se for string, fazer parse
    if (typeof customVars === "string") {
      try {
        customVars = JSON.parse(customVars);
      } catch (error) {
        logger.error("Error parsing customVariables:", error);
        return message;
      }
    }

    if (typeof varsData === "string") {
      try {
        varsData = JSON.parse(varsData);
      } catch (error) {
        logger.error("Error parsing variablesData:", error);
        return message;
      }
    }

    // Se vier como array com elementos que são strings, fazer parse recursivo
    if (Array.isArray(customVars) && customVars.length > 0 && typeof customVars[0] === "string") {
      try {
        // Pegar o último elemento (que geralmente é o JSON válido)
        const lastElement = customVars[customVars.length - 1];
        customVars = JSON.parse(lastElement);
      } catch (error) {
        logger.error("Error parsing nested customVariables:", error);
        return message;
      }
    }

    if (Array.isArray(varsData) && varsData.length > 0 && typeof varsData[0] === "string") {
      try {
        // Pegar o último elemento (que geralmente é o JSON válido)
        const lastElement = varsData[varsData.length - 1];
        varsData = JSON.parse(lastElement);
      } catch (error) {
        logger.error("Error parsing nested variablesData:", error);
        return message;
      }
    }

    if (!Array.isArray(customVars) || !Array.isArray(varsData)) {
      logger.warn("customVariables ou variablesData não são arrays válidos após parse");
      return message;
    }

    // 4. Normalizar número do contato
    const contactNumber = normalizeBrazilianNumber(
      campaignContact.contact?.number || ""
    );

    // 5. Encontrar os dados deste contato específico pelo número
    const contactData = varsData.find(data => {
      const normalizedValues = Object.values(data).map(v =>
        normalizeBrazilianNumber(String(v))
      );
      return normalizedValues.includes(contactNumber);
    });

    // Se não encontrar dados para este contato, retornar mensagem sem substituições
    if (!contactData) {
      logger.warn(
        `Dados de variáveis não encontrados para o contato ${contactNumber}`
      );
      return message;
    }

    // 6. Substituir cada variável customizada na mensagem
    customVars.forEach(variable => {
      // Extrair o nome da variável (ex: "{{cidade}}" -> "cidade")
      const rawName = variable.value.replace(/[{}]/g, "").trim();

      // Buscar o valor nos dados do contato
      let raw = contactData[rawName];

      // Se não encontrar, tentar sem acentos
      if (raw == null) {
        const noAccent = rawName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        raw = contactData[noAccent];
      }

      // Se encontrou o valor, substituir na mensagem
      const variableValue = raw != null ? String(raw) : "";
      const regex = new RegExp(`\\{\\{\\s*${rawName}\\s*\\}\\}`, "g");
      message = message.replace(regex, variableValue);
    });

    return message;
  } catch (error) {
    logger.error("Error in SetPersonalMessage:", error);
    return message; // Em caso de erro, retornar mensagem original
  }
};

export default SetPersonalMessage;