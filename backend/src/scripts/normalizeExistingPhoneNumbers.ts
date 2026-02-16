import { normalizePhoneNumber } from "../utils/phoneNumberNormalizer";
import Contact from "../models/Contact";
import { logger } from "../utils/logger";
import sequelize from "../database";
import { Op } from "sequelize";

/**
 * Script para normalizar números de telefone existentes no banco
 * Remove o dígito 9 e adiciona o código do país (55) quando necessário
 * Compatível com WhatsApp que não funciona com o 9
 */
const normalizeExistingPhoneNumbers = async (): Promise<void> => {
  try {
    logger.info("Iniciando normalização de números de telefone existentes...");
    logger.info("NOVA LÓGICA: Remove o 9 e adiciona o 55 quando necessário");

    // Busca todos os contatos que podem ter o dígito 9
    const contacts = await Contact.findAll({
      where: {
        number: {
          [Op.ne]: null as any
        }
      }
    });

    logger.info(`Encontrados ${contacts.length} contatos para processar`);

    let updatedCount = 0;
    let errorCount = 0;
    let conflictsCount = 0;

    for (const contact of contacts) {
      try {
        const originalNumber = contact.number;
        const normalized = normalizePhoneNumber(originalNumber);

        // Se o número foi normalizado e mudou
        if (normalized.hasChanges && normalized.normalized !== originalNumber) {
          logger.info(`Processando contato ${contact.id}: ${originalNumber} → ${normalized.normalized}`);

          // Verifica se já existe um contato com o número normalizado
          const existingContact = await Contact.findOne({
            where: {
              number: normalized.normalized,
              tenantId: contact.tenantId,
              id: {
                [Op.ne]: contact.id
              }
            }
          });

          if (existingContact) {
            logger.warn(`Conflito detectado: contato ${contact.id} (${originalNumber}) conflita com contato ${existingContact.id} (${normalized.normalized})`);
            conflictsCount++;
            
            // Opção 1: Deletar o contato com 9 (mais recente)
            // Opção 2: Ignorar e manter ambos
            // Opção 3: Mover tickets para o contato sem 9
            
            // Implementação: Deletar o contato com 9 (mais recente)
            if (contact.createdAt > existingContact.createdAt) {
              logger.info(`Deletando contato mais recente com 9: ${contact.id}`);
              await contact.destroy();
              errorCount++;
            } else {
              logger.info(`Mantendo contato mais antigo sem 9: ${existingContact.id}`);
              await contact.destroy();
              errorCount++;
            }
            continue;
          }

          // Atualiza o número
          await contact.update({ number: normalized.normalized });
          updatedCount++;

          logger.info(`Contato ${contact.id}: ${originalNumber} → ${normalized.normalized}`);
        }
      } catch (error) {
        logger.error(`Erro ao processar contato ${contact.id}:`, error);
        errorCount++;
      }
    }

    logger.info(`Normalização concluída:`);
    logger.info(`- ${updatedCount} contatos atualizados`);
    logger.info(`- ${errorCount} contatos com erro/deletados`);
    logger.info(`- ${conflictsCount} conflitos resolvidos`);
  } catch (error) {
    logger.error("Erro durante a normalização:", error);
    throw error;
  }
};

/**
 * Script para detectar contatos duplicados (com e sem 9)
 */
const detectDuplicateContacts = async (): Promise<void> => {
  try {
    logger.info("Detectando contatos duplicados (com e sem dígito 9)...");

    // Busca todos os contatos
    const contacts = await Contact.findAll({
      where: {
        number: {
          [Op.ne]: null as any
        }
      },
      order: [['createdAt', 'ASC']]
    });

    const duplicates: Array<{
      original: Contact;
      duplicates: Contact[];
      normalizedNumber: string;
    }> = [];
    const processed = new Set<number>();

    for (const contact of contacts) {
      if (processed.has(contact.id)) continue;

      const normalized = normalizePhoneNumber(contact.number);
      
      // Busca contatos similares
      const similarContacts = contacts.filter(c => {
        if (c.id === contact.id) return false;
        const cNormalized = normalizePhoneNumber(c.number);
        return cNormalized.normalized === normalized.normalized;
      });

      if (similarContacts.length > 0) {
        duplicates.push({
          original: contact,
          duplicates: similarContacts,
          normalizedNumber: normalized.normalized
        });
        
        // Marca todos como processados
        processed.add(contact.id);
        similarContacts.forEach(c => processed.add(c.id));
      }
    }

    logger.info(`Encontrados ${duplicates.length} grupos de contatos duplicados:`);
    
    duplicates.forEach((group, index) => {
      logger.info(`\nGrupo ${index + 1} (${group.normalizedNumber}):`);
      logger.info(`  Original: ${group.original.id} - ${group.original.number} (${group.original.name}) - ${group.original.createdAt}`);
      group.duplicates.forEach(dup => {
        logger.info(`  Duplicado: ${dup.id} - ${dup.number} (${dup.name}) - ${dup.createdAt}`);
      });
    });

  } catch (error) {
    logger.error("Erro ao detectar duplicatas:", error);
    throw error;
  }
};

// Executa o script se chamado diretamente
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'detect') {
    detectDuplicateContacts()
      .then(() => {
        logger.info("Detecção de duplicatas concluída");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("Erro ao executar detecção de duplicatas:", error);
        process.exit(1);
      });
  } else {
    normalizeExistingPhoneNumbers()
      .then(() => {
        logger.info("Script de normalização executado com sucesso");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("Erro ao executar script de normalização:", error);
        process.exit(1);
      });
  }
}

export default normalizeExistingPhoneNumbers;
export { detectDuplicateContacts };
