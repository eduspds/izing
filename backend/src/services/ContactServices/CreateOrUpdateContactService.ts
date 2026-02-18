import { Op } from "sequelize";
import socketEmit from "../../helpers/socketEmit";
import Contact from "../../models/Contact";
import { sanitizeJidToPhone } from "../../types/baileysAdapter";
import {
  normalizeForComparison,
  findMostSimilarNumber,
  isValidPhoneNumber as isValidPhoneNumberLegacy,
  generateNumberVariations,
  normalizeToBrazilianStorage
} from "../../utils/phoneNumberSimilarity";
import { normalizePhoneNumber } from "../../utils/phoneNumberNormalizer";
import { isPossiblePhoneNumber } from "../../utils/phoneValidator";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
  tenantId: string | number;
  pushname: string;
  isUser: boolean;
  isWAContact: boolean;
  telegramId?: string | number;
  instagramPK?: string | number;
  messengerId?: string | number;
  origem?: string;
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumberInput,
  profilePicUrl,
  isGroup,
  tenantId,
  pushname,
  isUser,
  isWAContact,
  email = "",
  telegramId,
  instagramPK,
  messengerId,
  extraInfo = [],
  origem = "whatsapp"
}: Request): Promise<Contact> => {
  // Nunca salvar JID bruto no campo de telefone: extrair apenas dígitos (remove @s.whatsapp.net, :1, :2, etc.)
  const rawNumber =
    rawNumberInput && /[@:]/.test(rawNumberInput)
      ? sanitizeJidToPhone(rawNumberInput)
      : (rawNumberInput || "").replace(/\D/g, "").trim() || rawNumberInput || "";

  // Validação prévia para números não-grupo usando libphonenumber-js
  let numberOverride: string | null = null;
  if (!isGroup) {
    // Tenta validar sem país padrão (para números internacionais)
    // Se falhar, tenta com BR como padrão (para números brasileiros)
    const isValid = isPossiblePhoneNumber(rawNumber) ||
                    isPossiblePhoneNumber(rawNumber, "BR" as any) ||
                    isValidPhoneNumberLegacy(rawNumber); // Fallback para compatibilidade

    if (!isValid) {
      // Para mensagens do WhatsApp: não descartar contato por validação estrita (ex.: formato @lid, internacional).
      // Aceita sequência de 10 a 15 dígitos para que a mensagem não se perca.
      if (origem === "whatsapp") {
        const digits = (rawNumber || "").replace(/\D/g, "");
        if (digits.length >= 10 && digits.length <= 15 && /^\d+$/.test(digits)) {
          logger.warn(
            `[CreateOrUpdateContactService] Número não passou na validação estrita; aceito como possível WhatsApp (10-15 dígitos): ${rawNumber}`
          );
          numberOverride = digits;
        }
      }
      if (!numberOverride) {
        throw new Error(
          `Número de telefone inválido: ${rawNumber}. Verifique se o número está completo e correto.`
        );
      }
    }
  }

  // Normaliza o número para comparação/busca
  const number = isGroup
    ? String(rawNumber)
    : (numberOverride ?? normalizeForComparison(rawNumber));

  // Padrão de armazenamento: campo number contém apenas dígitos (DDI + DDD + número)
  const numberToStore = isGroup
    ? number
    : (() => {
        const normalized =
          number.startsWith("55") && number.length >= 12
            ? normalizeToBrazilianStorage(number)
            : number;
        return normalized.replace(/\D/g, "") || normalized;
      })();

  let contact: Contact | null = null;

  if (origem === "whatsapp") {
    const findWhere =
      !isGroup && number.startsWith("55")
        ? { tenantId, number: { [Op.in]: generateNumberVariations(number) } }
        : { number, tenantId };
    contact = await Contact.findOne({ where: findWhere });

    // Se não encontrou, busca por similaridade
    if (!contact) {
      const allContacts = await Contact.findAll({
        where: { tenantId },
        attributes: ["id", "number", "name"]
      });

      const existingNumbers = allContacts.map(c => c.number);
      const similarNumber = findMostSimilarNumber(number, existingNumbers, 90);

      if (similarNumber) {
        contact =
          allContacts.find(c => c.number === similarNumber.number) || null;
        console.log(
          `Contato similar encontrado (dígito 9): ${
            similarNumber.number
          } (${similarNumber.similarity.toFixed(1)}% similar)`
        );
      }
    }

    // Se ainda não encontrou contato, verifica se o número original tem 9 e implementa lógica inteligente
    if (!contact && !isGroup && rawNumber) {
      const normalized = normalizePhoneNumber(rawNumber);
      
      // Se o número tem 9 para remover, busca contatos similares
      if (normalized.hasChanges) {
        console.log(`[CreateOrUpdateContactService] Número com 9 detectado: ${rawNumber} → ${normalized.normalized}`);
        
        const allContacts = await Contact.findAll({
          where: { 
            tenantId,
            isGroup: false,
            number: {
              [require("sequelize").Op.ne]: null as any
            }
          },
          attributes: ["id", "number", "name"]
        });

        const existingNumbers = allContacts.map(c => c.number);
        const similarContact = findMostSimilarNumber(rawNumber, existingNumbers, 90);

        if (similarContact) {
          const existingContact = allContacts.find(c => c.number === similarContact.number);
          
          if (existingContact) {
            console.log(`[CreateOrUpdateContactService] Contato similar encontrado: ${existingContact.id} (${existingContact.number}) - usando este contato`);
            
            // Transfere tickets do contato com 9 (se existir) para o contato sem 9
            // Nota: Como estamos criando um novo contato, não há tickets para transferir ainda
            
            contact = existingContact;
          }
        }
      }
    }
  }

  if (origem === "telegram" && telegramId) {
    contact = await Contact.findOne({ where: { telegramId, tenantId } });
  }

  if (origem === "instagram" && instagramPK) {
    contact = await Contact.findOne({ where: { instagramPK, tenantId } });
  }

  if (origem === "messenger" && messengerId) {
    contact = await Contact.findOne({ where: { messengerId, tenantId } });
  }

  if (contact) {
    const updateData: Record<string, any> = {
      profilePicUrl,
      pushname,
      isUser,
      isWAContact,
      telegramId,
      instagramPK,
      messengerId
    };
    if (numberToStore && numberToStore !== (contact as any).number) {
      updateData.number = numberToStore;
    }
    const currentName = String((contact as any).name ?? "").trim();
    const hasUserProvidedName = currentName.length >= 2 && currentName !== String((contact as any).number ?? "").trim();
    if (name && name.trim() && !hasUserProvidedName) {
      updateData.name = name.trim();
    }
    contact.update(updateData);
  } else {
    try {
      contact = await Contact.create({
        name,
        number: numberToStore,
        profilePicUrl,
        email,
        isGroup,
        pushname,
        isUser,
        isWAContact,
        tenantId,
        extraInfo,
        telegramId,
        instagramPK,
        messengerId
      });
    } catch (error) {
      if ((error as any).name === "SequelizeUniqueConstraintError") {
        const findWhere =
          !isGroup && number.startsWith("55")
            ? { tenantId, number: { [Op.in]: generateNumberVariations(number) } }
            : { number, tenantId };
        contact = await Contact.findOne({ where: findWhere });
        if (contact) {
          const updateData: Record<string, any> = {
            profilePicUrl,
            pushname,
            isUser,
            isWAContact,
            telegramId,
            instagramPK,
            messengerId
          };
          if (numberToStore && numberToStore !== (contact as any).number) updateData.number = numberToStore;
          const currentName = String((contact as any).name ?? "").trim();
          const hasUserProvidedName = currentName.length >= 2 && currentName !== String((contact as any).number ?? "").trim();
          if (name && name.trim() && !hasUserProvidedName) updateData.name = name.trim();
          await contact.update(updateData);
        }
      } else {
        throw error;
      }
    }
  }

  if (!contact) {
    throw new Error("Failed to create or find contact");
  }

  socketEmit({
    tenantId,
    type: "contact:update",
    payload: contact
  });

  return contact;
};

export default CreateOrUpdateContactService;
