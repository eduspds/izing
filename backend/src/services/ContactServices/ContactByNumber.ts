import Contact from "../../models/Contact";
import sequelize from "../../database";
import { QueryTypes } from "sequelize";
import { findMostSimilarNumber, normalizeForComparison } from "../../utils/phoneNumberSimilarity";

const FindByNumber = async (contactNumber: string) => {
    const normalizedNumber = normalizeForComparison(contactNumber);
    
    // Primeiro, tenta encontrar o contato exato
    let contact = await Contact.findOne({ 
        where: { number: normalizedNumber }
    });
    
    // Se não encontrou, busca por similaridade
    if (!contact) {
        const allContacts = await Contact.findAll({
            attributes: ['id', 'number', 'name', 'email', 'profilePicUrl', 'pushname', 'isUser', 'isWAContact', 'isGroup', 'tenantId', 'createdAt', 'updatedAt']
        });
        
        const existingNumbers = allContacts.map(c => c.number);
        const similarNumber = findMostSimilarNumber(normalizedNumber, existingNumbers, 90);
        
        if (similarNumber) {
          contact = allContacts.find(c => c.number === similarNumber.number) || null;
          console.log(`Contato similar encontrado (dígito 9): ${similarNumber.number} (${similarNumber.similarity.toFixed(1)}% similar)`);
        }
    }

    return contact;
};

export default FindByNumber;