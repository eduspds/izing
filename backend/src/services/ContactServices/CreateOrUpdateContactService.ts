import socketEmit from "../../helpers/socketEmit";
import Contact from "../../models/Contact";
import { 
  normalizeForComparison,
  findMostSimilarNumber, 
  isValidPhoneNumber as isValidPhoneNumberLegacy
} from "../../utils/phoneNumberSimilarity";
import { normalizePhoneNumber } from "../../utils/phoneNumberNormalizer";
import { isPossiblePhoneNumber } from "../../utils/phoneValidator";
import Ticket from "../../models/Ticket";

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
  number: rawNumber,
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
  // Validação prévia para números não-grupo usando libphonenumber-js
  if (!isGroup) {
    // Tenta validar sem país padrão (para números internacionais)
    // Se falhar, tenta com BR como padrão (para números brasileiros)
    const isValid = isPossiblePhoneNumber(rawNumber) ||
                    isPossiblePhoneNumber(rawNumber, "BR" as any) ||
                    isValidPhoneNumberLegacy(rawNumber); // Fallback para compatibilidade
    
    if (!isValid) {
      throw new Error(
        `Número de telefone inválido: ${rawNumber}. Verifique se o número está completo e correto.`
      );
    }
  }

  // Normaliza o número para comparação
  const number = isGroup
    ? String(rawNumber)
    : normalizeForComparison(rawNumber);

  let contact: Contact | null = null;

  if (origem === "whatsapp") {
    // Primeiro, tenta encontrar o contato exato
    contact = await Contact.findOne({ where: { number, tenantId } });

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
    contact.update({
      profilePicUrl,
      pushname,
      isUser,
      isWAContact,
      telegramId,
      instagramPK,
      messengerId
    });
  } else {
    try {
      contact = await Contact.create({
        name,
        number,
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
      // Se o erro for de unique constraint, buscar o contato que já existe
      if ((error as any).name === "SequelizeUniqueConstraintError") {
        contact = await Contact.findOne({ where: { number, tenantId } });
        if (contact) {
          await contact.update({
            profilePicUrl,
            pushname,
            isUser,
            isWAContact,
            telegramId,
            instagramPK,
            messengerId
          });
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
